import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAuth, requireOwner } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.position));

  return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
  const { session, error } = await requireOwner();
  if (error) return error;

  const body = await request.json();

  const maxPositionResult = await db
    .select({ position: tasks.position })
    .from(tasks)
    .orderBy(asc(tasks.position));

  const sameStatusTasks = maxPositionResult.filter(
    (t) => t.position !== undefined
  );
  const maxPosition =
    sameStatusTasks.length > 0
      ? Math.max(...sameStatusTasks.map((t) => t.position))
      : 0;

  const [task] = await db
    .insert(tasks)
    .values({
      title: body.title,
      description: body.description || null,
      status: body.status || "backlog",
      priority: body.priority || "medium",
      assignee: body.assignee || "agency",
      position: maxPosition + 1000,
      dueDate: body.dueDate || null,
      createdBy: session.userId,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
