import { after } from "next/server";
import { db } from "@/db";
import { taskEvents, tasks, notDeleted } from "@/db/schema";
import type { Task, TaskEventType } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNotificationForEvent } from "@/lib/notifications";

export interface LogEventParams {
  taskId: string;
  actorId: string | null;
  type: TaskEventType;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export async function logTaskEvent(params: LogEventParams) {
  await db.insert(taskEvents).values({
    taskId: params.taskId,
    actorId: params.actorId,
    type: params.type,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    metadata: params.metadata ?? null,
  });

  try {
    after(() => sendNotificationForEvent(params));
  } catch {
    // after() unavailable outside request context (seed scripts, tests)
    sendNotificationForEvent(params).catch(() => {});
  }
}

const FIELD_EVENT_MAP: Record<string, TaskEventType> = {
  status: "status_changed",
  priority: "priority_changed",
  assignee: "assignee_changed",
  reviewer: "reviewer_changed",
  dueDate: "due_date_changed",
  title: "title_changed",
  description: "description_changed",
};

/**
 * Compare old task state with incoming updates and log an event
 * for each field that actually changed.
 */
export async function logTaskChanges(
  oldTask: Task,
  updates: Record<string, unknown>,
  actorId: string | null,
) {
  const events: LogEventParams[] = [];

  for (const [field, eventType] of Object.entries(FIELD_EVENT_MAP)) {
    const key = field as keyof Task;
    if (updates[key] !== undefined && updates[key] !== oldTask[key]) {
      const isDescription = field === "description";
      events.push({
        taskId: oldTask.id,
        actorId,
        type: eventType,
        oldValue: isDescription ? null : oldTask[key],
        newValue: isDescription ? null : updates[key],
      });
    }
  }

  if (events.length > 0) {
    await Promise.all(events.map(logTaskEvent));
  }
}

/**
 * Fetch the current task state before an update, for comparison.
 */
export async function getTaskForComparison(taskId: string): Promise<Task | null> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), notDeleted))
    .limit(1);
  return task ?? null;
}
