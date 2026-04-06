import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { taskEvents, tasks, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  // Allow viewing events even for soft-deleted tasks (full lifecycle visibility)
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const events = await db
    .select({
      id: taskEvents.id,
      type: taskEvents.type,
      oldValue: taskEvents.oldValue,
      newValue: taskEvents.newValue,
      metadata: taskEvents.metadata,
      createdAt: taskEvents.createdAt,
      actorId: taskEvents.actorId,
      actorName: users.name,
      actorRole: users.role,
    })
    .from(taskEvents)
    .leftJoin(users, eq(taskEvents.actorId, users.id))
    .where(eq(taskEvents.taskId, id))
    .orderBy(asc(taskEvents.createdAt));

  return NextResponse.json(events);
}
