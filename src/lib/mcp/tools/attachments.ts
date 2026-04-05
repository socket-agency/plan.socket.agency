import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/db";
import { attachments, tasks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { get } from "@vercel/blob";

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
  server.registerTool("get_task_attachments", {
    title: "Get Task Attachments",
    description: "List all attachment metadata for a task",
    inputSchema: {
      taskId: z.string().uuid().describe("The task ID"),
    },
  }, async ({ taskId }) => {
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Task not found" }) }],
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
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("get_attachment_file", {
    title: "Get Attachment File",
    description:
      "Get the content of an attachment. Returns base64 image data for images, text content for text files, or metadata for large/binary files.",
    inputSchema: {
      attachmentId: z.string().uuid().describe("The attachment ID"),
    },
  }, async ({ attachmentId }) => {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Attachment not found" }) }],
        isError: true,
      };
    }

    // For large files, return metadata only
    if (attachment.size > MAX_INLINE_SIZE) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            note: "File too large for inline transfer (>5MB). Use the app UI to view.",
          }),
        }],
      };
    }

    try {
      const result = await get(attachment.url, { access: "private" });

      if (!result || result.statusCode !== 200) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "File not found in storage" }) }],
          isError: true,
        };
      }

      // Images: return as base64 ImageContent
      if (isImageType(attachment.contentType)) {
        const buffer = await result.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(buffer))
        );
        return {
          content: [{
            type: "image" as const,
            data: base64,
            mimeType: attachment.contentType,
          }],
        };
      }

      // Text files: return as text content
      if (isTextType(attachment.contentType)) {
        const text = await result.text();
        return {
          content: [{
            type: "text" as const,
            text: `--- ${attachment.filename} ---\n${text}`,
          }],
        };
      }

      // Binary files: return metadata
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            note: "Binary file. Use the app UI to download.",
          }),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "Failed to fetch file from storage" }),
        }],
        isError: true,
      };
    }
  });
}
