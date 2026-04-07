import { z } from "zod";
import { db } from "@/db";
import { attachments, tasks, notDeleted } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { get, put } from "@vercel/blob";
import { logTaskEvent } from "@/lib/task-events";
import { defineTool, type McpServer } from "@/lib/mcp/define-tool";

const MAX_INLINE_SIZE = 5 * 1024 * 1024; // 5MB

function isImageType(contentType: string): boolean {
  return /^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(contentType);
}

function isTextType(contentType: string): boolean {
  return (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/xml"
  );
}

export function registerAttachmentTools(server: McpServer) {
  defineTool(
    server,
    "get_task_attachments",
    "List all attachment metadata for a task",
    { taskId: z.string().uuid().describe("The task ID") },
    async ({ taskId }) => {
      const [task] = await db
        .select({ id: tasks.id })
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

      const result = await db
        .select({
          id: attachments.id,
          filename: attachments.filename,
          contentType: attachments.contentType,
          size: attachments.size,
          createdAt: attachments.createdAt,
        })
        .from(attachments)
        .where(eq(attachments.taskId, taskId))
        .orderBy(asc(attachments.createdAt));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  defineTool(
    server,
    "get_attachment_file",
    "Get the content of an attachment. Returns base64 image data for images, text content for text files, or metadata for large/binary files.",
    { attachmentId: z.string().uuid().describe("The attachment ID") },
    async ({ attachmentId }) => {
      const [attachment] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, attachmentId))
        .limit(1);

      if (!attachment) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Attachment not found" }),
            },
          ],
          isError: true,
        };
      }

      if (attachment.size > MAX_INLINE_SIZE) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                filename: attachment.filename,
                contentType: attachment.contentType,
                size: attachment.size,
                note: "File too large for inline transfer (>5MB). Use the app UI to view.",
              }),
            },
          ],
        };
      }

      try {
        const result = await get(attachment.url, { access: "private" });

        if (!result || result.statusCode !== 200) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "File not found in storage" }),
              },
            ],
            isError: true,
          };
        }

        const response = new Response(result.stream);

        if (isImageType(attachment.contentType)) {
          const buffer = await response.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(buffer))
          );
          return {
            content: [
              {
                type: "image" as const,
                data: base64,
                mimeType: attachment.contentType,
              },
            ],
          };
        }

        if (isTextType(attachment.contentType)) {
          const text = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `--- ${attachment.filename} ---\n${text}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                filename: attachment.filename,
                contentType: attachment.contentType,
                size: attachment.size,
                note: "Binary file. Use the app UI to download.",
              }),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to fetch file from storage",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  defineTool(
    server,
    "add_attachment",
    "Upload a file attachment to a task. Content must be base64-encoded. Max 5MB.",
    {
      taskId: z.string().uuid().describe("The task ID"),
      filename: z
        .string()
        .min(1)
        .max(255)
        .describe("Original filename including extension"),
      contentType: z
        .string()
        .min(1)
        .describe("MIME type of the file (e.g. image/png, application/pdf)"),
      base64Content: z
        .string()
        .min(1)
        .describe("File content encoded as base64"),
    },
    async ({ taskId, filename, contentType, base64Content }, extra) => {
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

      const buffer = Buffer.from(base64Content, "base64");

      if (buffer.length > MAX_INLINE_SIZE) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  "File too large. Maximum size is 5MB. Use the web UI for larger files.",
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const blob = await put(filename, buffer, {
          access: "private",
          contentType,
          addRandomSuffix: true,
        });

        const [attachment] = await db
          .insert(attachments)
          .values({
            taskId,
            uploadedBy: userId,
            url: blob.url,
            pathname: blob.pathname,
            filename,
            contentType,
            size: buffer.length,
          })
          .returning();

        await logTaskEvent({
          taskId,
          actorId: userId,
          type: "attachment_added",
          metadata: { attachmentId: attachment.id },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                created: {
                  id: attachment.id,
                  taskId,
                  filename,
                  size: buffer.length,
                },
              }),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to upload file to storage",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
