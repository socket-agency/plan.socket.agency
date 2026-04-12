import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks, taskStatuses, taskPriorities, taskAssignees, notDeleted } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { logTaskEvent } from "@/lib/task-events";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullish(),
  status: z.enum(taskStatuses).default("backlog"),
  priority: z.enum(taskPriorities).default("medium"),
  assignee: z.enum(taskAssignees).default("agency"),
  reviewer: z.enum(taskAssignees).nullish(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullish(),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const allTasks = await db.select().from(tasks).where(notDeleted).orderBy(asc(tasks.position));

  return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
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

  const isClient = session.role === "client";
  const { title, description, priority, assignee, reviewer, dueDate } = parsed.data;
  const status = isClient ? "backlog" as const : parsed.data.status;

  const [{ maxPosition }] = await db
    .select({ maxPosition: sql<number>`coalesce(max(${tasks.position}), 0)` })
    .from(tasks)
    .where(notDeleted);

  const [task] = await db
    .insert(tasks)
    .values({
      title,
      description: description || null,
      status,
      priority,
      assignee,
      reviewer: reviewer ?? null,
      position: maxPosition + 1000,
      dueDate: dueDate || null,
      createdBy: session.userId,
    })
    .returning();

  await logTaskEvent({
    taskId: task.id,
    actorId: session.userId,
    type: "task_created",
    newValue: { status: task.status, priority: task.priority, assignee: task.assignee, reviewer: task.reviewer },
  });

  return NextResponse.json(task, { status: 201 });
}
