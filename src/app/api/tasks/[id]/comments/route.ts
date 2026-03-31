import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

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

  return NextResponse.json(comment, { status: 201 });
}
