import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { comments, tasks, users, notDeleted } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { logTaskEvent } from "@/lib/task-events";

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

async function validateTaskId(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: NextResponse.json({ error: "Invalid task ID" }, { status: 400 }) };
  }
  const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, id), notDeleted)).limit(1);
  if (!task) {
    return { error: NextResponse.json({ error: "Task not found" }, { status: 404 }) };
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

  const taskComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, id))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json(taskComments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskCheck = await validateTaskId(id);
  if (taskCheck.error) return taskCheck.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Comment body is required" },
      { status: 400 }
    );
  }

  const [comment] = await db
    .insert(comments)
    .values({
      taskId: id,
      authorId: session.userId,
      body: parsed.data.body,
    })
    .returning();

  await logTaskEvent({
    taskId: id,
    actorId: session.userId,
    type: "comment_added",
    metadata: { commentId: comment.id },
  });

  // Re-query with author join so the response matches CommentWithAuthor shape
  const [commentWithAuthor] = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.id, comment.id));

  return NextResponse.json(commentWithAuthor, { status: 201 });
}
