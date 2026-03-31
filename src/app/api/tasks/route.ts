import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks, taskStatuses, taskPriorities, taskAssignees } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAuth, requireOwner } from "@/lib/api-auth";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullish(),
  status: z.enum(taskStatuses).default("backlog"),
  priority: z.enum(taskPriorities).default("medium"),
  assignee: z.enum(taskAssignees).default("agency"),
  dueDate: z.string().nullish(),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.position));

  return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
  const { session, error } = await requireOwner();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, status, priority, assignee, dueDate } = parsed.data;

  const allTasks = await db
    .select({ position: tasks.position })
    .from(tasks);
  const maxPosition =
    allTasks.length > 0
      ? Math.max(...allTasks.map((t) => t.position))
      : 0;

  const [task] = await db
    .insert(tasks)
    .values({
      title,
      description: description || null,
      status,
      priority,
      assignee,
      position: maxPosition + 1000,
      dueDate: dueDate || null,
      createdBy: session.userId,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
