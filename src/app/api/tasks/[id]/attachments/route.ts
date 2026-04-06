import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attachments, tasks, notDeleted } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { logTaskEvent } from "@/lib/task-events";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

async function validateTaskId(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    return {
      error: NextResponse.json({ error: "Invalid task ID" }, { status: 400 }),
    };
  }
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), notDeleted))
    .limit(1);
  if (!task) {
    return {
      error: NextResponse.json({ error: "Task not found" }, { status: 404 }),
    };
  }
  return { error: null };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskCheck = await validateTaskId(id);
  if (taskCheck.error) return taskCheck.error;

  const taskAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.taskId, id))
    .orderBy(asc(attachments.createdAt));

  return NextResponse.json(taskAttachments);
}

const registerAttachmentSchema = z.object({
  url: z.string().url(),
  pathname: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().positive(),
});

// Two-purpose POST: Vercel Blob client token handshake OR attachment registration.
// The client calls upload() which hits this route for the token, then after upload
// completes, the client sends a second request to register the attachment in the DB.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskCheck = await validateTaskId(id);
  if (taskCheck.error) return taskCheck.error;

  const body = await request.json();

  // If the body has a `type` field, it's a Vercel Blob handshake request
  if (body.type) {
    const jsonResponse = await handleUpload({
      body: body as HandleUploadBody,
      request,
      onBeforeGenerateToken: async () => ({
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No-op: we register attachments via the second POST call instead,
        // because this webhook doesn't fire in local dev.
      },
    });
    return NextResponse.json(jsonResponse);
  }

  // Otherwise it's a registration request after the upload completed
  const parsed = registerAttachmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid attachment data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [attachment] = await db
    .insert(attachments)
    .values({
      taskId: id,
      uploadedBy: session.userId,
      url: parsed.data.url,
      pathname: parsed.data.pathname,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      size: parsed.data.size,
    })
    .returning();

  await logTaskEvent({
    taskId: id,
    actorId: session.userId,
    type: "attachment_added",
    metadata: { attachmentId: attachment.id, filename: parsed.data.filename },
  });

  return NextResponse.json(attachment, { status: 201 });
}
