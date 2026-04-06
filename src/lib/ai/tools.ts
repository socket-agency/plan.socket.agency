import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { tasks, notDeleted } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import type { UserRole } from "@/db/schema";
import { logTaskEvent, logTaskChanges, getTaskForComparison } from "@/lib/task-events";

function readTools() {
  return {
    listTasks: tool({
      description:
        "List all tasks, optionally filtered by status, priority, or assignee",
      inputSchema: z.object({
        status: z
          .enum(["backlog", "todo", "in_progress", "in_review", "done"])
          .optional()
          .describe("Filter by status"),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .optional()
          .describe("Filter by priority"),
        assignee: z
          .enum(["agency", "client"])
          .optional()
          .describe("Filter by assignee"),
      }),
      execute: async (params) => {
        let allTasks = await db
          .select()
          .from(tasks)
          .where(notDeleted)
          .orderBy(asc(tasks.position));

        if (params.status)
          allTasks = allTasks.filter((t) => t.status === params.status);
        if (params.priority)
          allTasks = allTasks.filter((t) => t.priority === params.priority);
        if (params.assignee)
          allTasks = allTasks.filter((t) => t.assignee === params.assignee);

        return allTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee,
          dueDate: t.dueDate,
        }));
      },
    }),

    getTask: tool({
      description: "Get full details of a specific task by ID",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID"),
      }),
      execute: async ({ taskId }) => {
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), notDeleted))
          .limit(1);
        return task || { error: "Task not found" };
      },
    }),

    getStatusSummary: tool({
      description:
        "Get a summary of tasks: counts per status, overdue tasks, and progress stats",
      inputSchema: z.object({}),
      execute: async () => {
        const allTasks = await db.select().from(tasks).where(notDeleted);
        const today = new Date().toISOString().split("T")[0];

        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        const byAssignee: Record<string, number> = {};
        let overdue = 0;

        for (const t of allTasks) {
          byStatus[t.status] = (byStatus[t.status] || 0) + 1;
          byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
          byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
          if (t.dueDate && t.dueDate < today && t.status !== "done") {
            overdue++;
          }
        }

        return {
          total: allTasks.length,
          byStatus,
          byPriority,
          byAssignee,
          overdue,
          completionRate: allTasks.length
            ? Math.round(((byStatus["done"] || 0) / allTasks.length) * 100)
            : 0,
        };
      },
    }),
  };
}

function writeTools(userId: string) {
  return {
    createTask: tool({
      description: "Create a new task",
      inputSchema: z.object({
        title: z.string().describe("Task title"),
        description: z
          .string()
          .optional()
          .describe("Task description (markdown)"),
        status: z
          .enum(["backlog", "todo", "in_progress", "in_review", "done"])
          .default("backlog"),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .default("medium"),
        assignee: z.enum(["agency", "client"]).default("agency"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in YYYY-MM-DD format"),
      }),
      execute: async (params) => {
        const allTasks = await db.select().from(tasks).where(notDeleted);
        const maxPos = Math.max(0, ...allTasks.map((t) => t.position));

        const [task] = await db
          .insert(tasks)
          .values({
            title: params.title,
            description: params.description || null,
            status: params.status as "backlog",
            priority: params.priority as "medium",
            assignee: params.assignee as "agency",
            position: maxPos + 1000,
            dueDate: params.dueDate || null,
            createdBy: userId,
          })
          .returning();

        await logTaskEvent({
          taskId: task.id,
          actorId: userId,
          type: "task_created",
          newValue: { status: task.status, priority: task.priority, assignee: task.assignee },
        });

        return { created: { id: task.id, title: task.title } };
      },
    }),

    updateTask: tool({
      description: "Update an existing task's fields",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID to update"),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["backlog", "todo", "in_progress", "in_review", "done"])
          .optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignee: z.enum(["agency", "client"]).optional(),
        dueDate: z
          .string()
          .optional()
          .describe("YYYY-MM-DD or empty to clear"),
      }),
      execute: async (params) => {
        const oldTask = await getTaskForComparison(params.taskId);
        if (!oldTask) return { error: "Task not found" };

        const setValues: Record<string, unknown> = {};
        if (params.title !== undefined) setValues.title = params.title;
        if (params.description !== undefined)
          setValues.description = params.description;
        if (params.status !== undefined) setValues.status = params.status;
        if (params.priority !== undefined) setValues.priority = params.priority;
        if (params.assignee !== undefined) setValues.assignee = params.assignee;
        if (params.dueDate !== undefined)
          setValues.dueDate = params.dueDate || null;

        const [task] = await db
          .update(tasks)
          .set(setValues)
          .where(and(eq(tasks.id, params.taskId), notDeleted))
          .returning();

        if (!task) return { error: "Task not found" };

        await logTaskChanges(oldTask, setValues, userId);

        return { updated: { id: task.id, title: task.title } };
      },
    }),

    deleteTask: tool({
      description: "Delete a task by ID",
      inputSchema: z.object({
        taskId: z.string().describe("The task ID to delete"),
      }),
      execute: async ({ taskId }) => {
        const [task] = await db
          .update(tasks)
          .set({ isDeleted: true, deletedAt: new Date() })
          .where(and(eq(tasks.id, taskId), notDeleted))
          .returning();
        if (!task) return { error: "Task not found" };

        await logTaskEvent({
          taskId: task.id,
          actorId: userId,
          type: "task_deleted",
        });

        return { deleted: task.title };
      },
    }),

    generateReport: tool({
      description:
        "Generate a progress report summarizing the current state of all tasks",
      inputSchema: z.object({
        format: z
          .enum(["brief", "detailed"])
          .default("brief")
          .describe("Report format"),
      }),
      execute: async ({ format }) => {
        const allTasks = await db.select().from(tasks).where(notDeleted);
        const today = new Date().toISOString().split("T")[0];

        const done = allTasks.filter((t) => t.status === "done");
        const inProgress = allTasks.filter(
          (t) => t.status === "in_progress" || t.status === "in_review"
        );
        const overdue = allTasks.filter(
          (t) => t.dueDate && t.dueDate < today && t.status !== "done"
        );

        if (format === "brief") {
          return {
            total: allTasks.length,
            completed: done.length,
            inProgress: inProgress.length,
            overdue: overdue.length,
            completionRate: allTasks.length
              ? `${Math.round((done.length / allTasks.length) * 100)}%`
              : "0%",
          };
        }

        return {
          total: allTasks.length,
          completed: done.map((t) => t.title),
          inProgress: inProgress.map((t) => ({
            title: t.title,
            status: t.status,
            assignee: t.assignee,
          })),
          overdue: overdue.map((t) => ({
            title: t.title,
            dueDate: t.dueDate,
          })),
          upcoming: allTasks
            .filter(
              (t) => t.dueDate && t.dueDate >= today && t.status !== "done"
            )
            .map((t) => ({
              title: t.title,
              dueDate: t.dueDate,
              assignee: t.assignee,
            })),
        };
      },
    }),
  };
}

function clientCreateTool(userId: string) {
  return {
    createTask: tool({
      description: "Create a new task. It will go to the Backlog column.",
      inputSchema: z.object({
        title: z.string().describe("Task title"),
        description: z
          .string()
          .optional()
          .describe("Task description (markdown)"),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .default("medium"),
        assignee: z.enum(["agency", "client"]).default("client"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in YYYY-MM-DD format"),
      }),
      execute: async (params) => {
        const allTasks = await db.select().from(tasks).where(notDeleted);
        const maxPos = Math.max(0, ...allTasks.map((t) => t.position));

        const [task] = await db
          .insert(tasks)
          .values({
            title: params.title,
            description: params.description || null,
            status: "backlog",
            priority: params.priority as "medium",
            assignee: params.assignee as "agency",
            position: maxPos + 1000,
            dueDate: params.dueDate || null,
            createdBy: userId,
          })
          .returning();

        await logTaskEvent({
          taskId: task.id,
          actorId: userId,
          type: "task_created",
          newValue: { status: "backlog", priority: task.priority, assignee: task.assignee },
        });

        return { created: { id: task.id, title: task.title, status: "backlog" } };
      },
    }),
  };
}

export function getTools(role: UserRole, userId: string) {
  if (role === "client") {
    return { ...readTools(), ...clientCreateTool(userId) };
  }
  return { ...readTools(), ...writeTools(userId) };
}
