import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/db";
import { comments, tasks, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export function registerCommentTools(server: McpServer) {
  server.tool(
    "get_task_comments",
    "Get all comments for a task, with author information",
    { taskId: z.string().uuid().describe("The task ID") },
    async ({ taskId }) => {
      const [task] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.id, taskId))
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

      const result = await db
        .select({
          id: comments.id,
          body: comments.body,
          createdAt: comments.createdAt,
          authorName: users.name,
          authorRole: users.role,
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.taskId, taskId))
        .orderBy(asc(comments.createdAt));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.tool(
    "add_comment",
    "Add a comment to a task",
    {
      taskId: z.string().uuid().describe("The task ID"),
      body: z.string().min(1).max(5000).describe("Comment text"),
    },
    async ({ taskId, body }, extra) => {
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

      const [task] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.id, taskId))
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

      const [comment] = await db
        .insert(comments)
        .values({ taskId, authorId: userId, body })
        .returning();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ created: { id: comment.id, taskId } }),
          },
        ],
      };
    }
  );
}
