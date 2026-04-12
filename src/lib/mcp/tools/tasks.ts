import { z } from "zod";
import { defineTool, type McpServer } from "@/lib/mcp/define-tool";
import { db } from "@/db";
import {
  tasks,
  comments,
  attachments,
  taskStatuses,
  taskPriorities,
  taskAssignees,
  notDeleted,
} from "@/db/schema";
import { eq, asc, and, sql } from "drizzle-orm";
import type { UserRole } from "@/db/schema";
import { logTaskEvent, logTaskChanges, getTaskForComparison } from "@/lib/task-events";
import { canEditTask, filterClientUpdates } from "@/lib/api-auth";

export function registerTaskTools(server: McpServer) {
  defineTool(server,
    "list_tasks",
    "List all tasks, optionally filtered by status, priority, or assignee",
    {
      status: z.enum(taskStatuses).optional().describe("Filter by status"),
      priority: z
        .enum(taskPriorities)
        .optional()
        .describe("Filter by priority"),
      assignee: z
        .enum(taskAssignees)
        .optional()
        .describe("Filter by assignee"),
      reviewer: z
        .enum(taskAssignees)
        .optional()
        .describe("Filter by reviewer"),
      search: z.string().optional().describe("Search in title and description"),
    },
    async ({ status, priority, assignee, reviewer, search }) => {
      let allTasks = await db
        .select()
        .from(tasks)
        .where(notDeleted)
        .orderBy(asc(tasks.position));

      if (status) allTasks = allTasks.filter((t) => t.status === status);
      if (priority) allTasks = allTasks.filter((t) => t.priority === priority);
      if (assignee) allTasks = allTasks.filter((t) => t.assignee === assignee);
      if (reviewer) allTasks = allTasks.filter((t) => t.reviewer === reviewer);
      if (search) {
        const q = search.toLowerCase();
        allTasks = allTasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        );
      }

      const result = allTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        reviewer: t.reviewer,
        dueDate: t.dueDate,
      }));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  defineTool(server,
    "get_task",
    "Get full details of a task by ID, including comment and attachment counts",
    { taskId: z.string().uuid().describe("The task ID") },
    async ({ taskId }) => {
      const [task] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), notDeleted))
        .limit(1);

      if (!task) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Task not found" }),
            },
          ],
          isError: true,
        };
      }

      const [commentCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.taskId, taskId));

      const [attachmentCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(attachments)
        .where(eq(attachments.taskId, taskId));

      const result = {
        ...task,
        commentCount: Number(commentCount.count),
        attachmentCount: Number(attachmentCount.count),
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  defineTool(server,
    "create_task",
    "Create a new task",
    {
      title: z.string().describe("Task title"),
      description: z
        .string()
        .optional()
        .describe("Task description (markdown)"),
      status: z.enum(taskStatuses).default("backlog"),
      priority: z.enum(taskPriorities).default("medium"),
      assignee: z.enum(taskAssignees).default("agency"),
      reviewer: z.enum(taskAssignees).nullish().describe("Task reviewer (optional)"),
      dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    },
    async (
      { title, description, status, priority, assignee, reviewer, dueDate },
      extra
    ) => {
      const role = (extra.authInfo?.extra as { role: UserRole })?.role;
      const userId = (extra.authInfo?.extra as { userId: string })?.userId;

      if (!userId) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Unauthorized" }),
            },
          ],
          isError: true,
        };
      }

      const effectiveStatus = role === "client" ? "backlog" : status;

      const [{ maxPos }] = await db
        .select({ maxPos: sql<number>`coalesce(max(${tasks.position}), 0)` })
        .from(tasks)
        .where(notDeleted);

      const [task] = await db
        .insert(tasks)
        .values({
          title,
          description: description || null,
          status: effectiveStatus,
          priority,
          assignee,
          reviewer: reviewer ?? null,
          position: maxPos + 1000,
          dueDate: dueDate || null,
          createdBy: userId,
        })
        .returning();

      await logTaskEvent({
        taskId: task.id,
        actorId: userId,
        type: "task_created",
        newValue: { status: task.status, priority: task.priority, assignee: task.assignee, reviewer: task.reviewer },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              created: { id: task.id, title: task.title, status: task.status },
            }),
          },
        ],
      };
    }
  );

  defineTool(server,
    "update_task",
    "Update an existing task's fields. Owners can update any task; clients can edit their own backlog tasks (title, description, priority, assignee, reviewer, dueDate only).",
    {
      taskId: z.string().uuid().describe("The task ID to update"),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(taskStatuses).optional(),
      priority: z.enum(taskPriorities).optional(),
      assignee: z.enum(taskAssignees).optional(),
      reviewer: z.enum(taskAssignees).nullish().describe("Reviewer, or null to clear"),
      dueDate: z.string().optional().describe("YYYY-MM-DD or empty to clear"),
    },
    async ({ taskId, ...params }, extra) => {
      const role = (extra.authInfo?.extra as { role: UserRole })?.role;
      const userId = (extra.authInfo?.extra as { userId: string })?.userId;

      if (!userId || !role) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Unauthorized" }),
            },
          ],
          isError: true,
        };
      }

      const oldTask = await getTaskForComparison(taskId);
      if (!oldTask) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Task not found" }),
            },
          ],
          isError: true,
        };
      }

      if (!canEditTask({ userId, role }, oldTask)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Forbidden" }),
            },
          ],
          isError: true,
        };
      }

      let setValues: Record<string, unknown> = {};
      if (params.title !== undefined) setValues.title = params.title;
      if (params.description !== undefined)
        setValues.description = params.description;
      if (params.status !== undefined) setValues.status = params.status;
      if (params.priority !== undefined) setValues.priority = params.priority;
      if (params.assignee !== undefined) setValues.assignee = params.assignee;
      if (params.reviewer !== undefined) setValues.reviewer = params.reviewer;
      if (params.dueDate !== undefined)
        setValues.dueDate = params.dueDate || null;

      if (role !== "owner") {
        const filtered = filterClientUpdates(setValues);
        if (!filtered) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Clients can only edit title, description, priority, assignee, reviewer, and due date on their own backlog tasks",
                }),
              },
            ],
            isError: true,
          };
        }
        setValues = filtered;
      }

      const [task] = await db
        .update(tasks)
        .set(setValues)
        .where(and(eq(tasks.id, taskId), notDeleted))
        .returning();

      if (!task) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Task not found" }),
            },
          ],
          isError: true,
        };
      }

      await logTaskChanges(oldTask, setValues, userId);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              updated: { id: task.id, title: task.title },
            }),
          },
        ],
      };
    }
  );

  defineTool(server,
    "delete_task",
    "Delete a task by ID. Owners can delete any task; clients can delete their own backlog tasks.",
    { taskId: z.string().uuid().describe("The task ID to delete") },
    async ({ taskId }, extra) => {
      const role = (extra.authInfo?.extra as { role: UserRole })?.role;
      const userId = (extra.authInfo?.extra as { userId: string })?.userId;

      if (!userId || !role) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Unauthorized" }),
            },
          ],
          isError: true,
        };
      }

      const existing = await getTaskForComparison(taskId);
      if (!existing) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Task not found" }),
            },
          ],
          isError: true,
        };
      }

      if (!canEditTask({ userId, role }, existing)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Forbidden" }),
            },
          ],
          isError: true,
        };
      }

      const [task] = await db
        .update(tasks)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(and(eq(tasks.id, taskId), notDeleted))
        .returning();

      if (!task) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Task not found" }),
            },
          ],
          isError: true,
        };
      }

      await logTaskEvent({
        taskId: task.id,
        actorId: userId,
        type: "task_deleted",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ deleted: task.title }),
          },
        ],
      };
    }
  );
}
