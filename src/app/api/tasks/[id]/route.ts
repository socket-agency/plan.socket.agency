import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks, attachments, taskStatuses, taskPriorities, taskAssignees, notDeleted } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { del } from "@vercel/blob";
import { requireAuth, requireOwner } from "@/lib/api-auth";
import { logTaskEvent, logTaskChanges, getTaskForComparison } from "@/lib/task-events";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  assignee: z.enum(taskAssignees).optional(),
  position: z.number().int().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullish(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), notDeleted))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireOwner();
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates = parsed.data;
  const setValues: Record<string, unknown> = {};
  if (updates.title !== undefined) setValues.title = updates.title;
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.status !== undefined) setValues.status = updates.status;
  if (updates.priority !== undefined) setValues.priority = updates.priority;
  if (updates.assignee !== undefined) setValues.assignee = updates.assignee;
  if (updates.position !== undefined) setValues.position = updates.position;
  if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;

  const oldTask = await getTaskForComparison(id);
  if (!oldTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const [task] = await db
    .update(tasks)
    .set(setValues)
    .where(and(eq(tasks.id, id), notDeleted))
    .returning();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await logTaskChanges(oldTask, setValues, session.userId);

  return NextResponse.json(task);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireOwner();
  if (error) return error;

  const { id } = await params;

  const [task] = await db
    .update(tasks)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(and(eq(tasks.id, id), notDeleted))
    .returning();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await logTaskEvent({
    taskId: task.id,
    actorId: session.userId,
    type: "task_deleted",
  });

  // Clean up blob storage (best-effort, don't fail the request if this errors)
  const taskAttachments = await db
    .select({ url: attachments.url })
    .from(attachments)
    .where(eq(attachments.taskId, id));

  if (taskAttachments.length > 0) {
    const urls = taskAttachments.map((a) => a.url);
    await del(urls).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
