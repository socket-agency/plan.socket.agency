import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/db";
import {
  tasks,
  comments,
  attachments,
  taskStatuses,
  taskPriorities,
  taskAssignees,
} from "@/db/schema";
import { eq, asc, sql, ilike, or } from "drizzle-orm";
import type { UserRole } from "@/db/schema";

export function registerTaskTools(server: McpServer) {
  server.registerTool("list_tasks", {
    title: "List Tasks",
    description:
      "List all tasks, optionally filtered by status, priority, or assignee",
    inputSchema: {
      status: z
        .enum(taskStatuses)
        .optional()
        .describe("Filter by status"),
      priority: z
        .enum(taskPriorities)
        .optional()
        .describe("Filter by priority"),
      assignee: z
        .enum(taskAssignees)
        .optional()
        .describe("Filter by assignee"),
      search: z
        .string()
        .optional()
        .describe("Search in title and description"),
    },
  }, async ({ status, priority, assignee, search }) => {
    let allTasks = await db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.position));

    if (status) allTasks = allTasks.filter((t) => t.status === status);
    if (priority) allTasks = allTasks.filter((t) => t.priority === priority);
    if (assignee) allTasks = allTasks.filter((t) => t.assignee === assignee);
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
      dueDate: t.dueDate,
    }));

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("get_task", {
    title: "Get Task",
    description:
      "Get full details of a task by ID, including comment and attachment counts",
    inputSchema: {
      taskId: z.string().uuid().describe("The task ID"),
    },
  }, async ({ taskId }) => {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Task not found" }) }],
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
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("create_task", {
    title: "Create Task",
    description: "Create a new task",
    inputSchema: {
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description (markdown)"),
      status: z.enum(taskStatuses).default("backlog"),
      priority: z.enum(taskPriorities).default("medium"),
      assignee: z.enum(taskAssignees).default("agency"),
      dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    },
  }, async ({ title, description, status, priority, assignee, dueDate }, extra) => {
    const role = (extra.authInfo?.extra as { role: UserRole })?.role;
    const userId = (extra.authInfo?.extra as { userId: string })?.userId;

    if (!userId) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Unauthorized" }) }],
        isError: true,
      };
    }

    const effectiveStatus = role === "client" ? "backlog" : status;

    const allTasks = await db.select({ position: tasks.position }).from(tasks);
    const maxPos = Math.max(0, ...allTasks.map((t) => t.position));

    const [task] = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        status: effectiveStatus as "backlog",
        priority: priority as "medium",
        assignee: assignee as "agency",
        position: maxPos + 1000,
        dueDate: dueDate || null,
        createdBy: userId,
      })
      .returning();

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ created: { id: task.id, title: task.title, status: task.status } }),
      }],
    };
  });

  server.registerTool("update_task", {
    title: "Update Task",
    description: "Update an existing task's fields (owner only)",
    inputSchema: {
      taskId: z.string().uuid().describe("The task ID to update"),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(taskStatuses).optional(),
      priority: z.enum(taskPriorities).optional(),
      assignee: z.enum(taskAssignees).optional(),
      dueDate: z.string().optional().describe("YYYY-MM-DD or empty to clear"),
    },
  }, async ({ taskId, ...params }, extra) => {
    const role = (extra.authInfo?.extra as { role: UserRole })?.role;
    if (role !== "owner") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Forbidden: owner role required" }) }],
        isError: true,
      };
    }

    const setValues: Record<string, unknown> = {};
    if (params.title !== undefined) setValues.title = params.title;
    if (params.description !== undefined) setValues.description = params.description;
    if (params.status !== undefined) setValues.status = params.status;
    if (params.priority !== undefined) setValues.priority = params.priority;
    if (params.assignee !== undefined) setValues.assignee = params.assignee;
    if (params.dueDate !== undefined) setValues.dueDate = params.dueDate || null;

    const [task] = await db
      .update(tasks)
      .set(setValues)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!task) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Task not found" }) }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ updated: { id: task.id, title: task.title } }),
      }],
    };
  });

  server.registerTool("delete_task", {
    title: "Delete Task",
    description: "Delete a task by ID (owner only)",
    inputSchema: {
      taskId: z.string().uuid().describe("The task ID to delete"),
    },
  }, async ({ taskId }, extra) => {
    const role = (extra.authInfo?.extra as { role: UserRole })?.role;
    if (role !== "owner") {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Forbidden: owner role required" }) }],
        isError: true,
      };
    }

    const [task] = await db
      .delete(tasks)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!task) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Task not found" }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: task.title }) }],
    };
  });
}
