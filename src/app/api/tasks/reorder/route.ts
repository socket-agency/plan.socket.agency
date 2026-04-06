import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks, taskStatuses } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireOwner } from "@/lib/api-auth";
import { logTaskEvent } from "@/lib/task-events";

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      status: z.enum(taskStatuses),
      position: z.number().int().nonnegative(),
    })
  ),
});

export async function PATCH(request: Request) {
  const { session, error } = await requireOwner();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reorder data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Fetch current statuses to detect actual status changes (not just position moves)
  const taskIds = parsed.data.items.map((i) => i.id);
  const currentTasks = await db
    .select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(inArray(tasks.id, taskIds));
  const statusMap = new Map(currentTasks.map((t) => [t.id, t.status]));

  await Promise.all(
    parsed.data.items.map((item) =>
      db
        .update(tasks)
        .set({
          status: item.status,
          position: item.position,
        })
        .where(eq(tasks.id, item.id))
    )
  );

  // Log status_changed events for tasks that actually changed column
  const statusChanges = parsed.data.items.filter(
    (item) => statusMap.get(item.id) && statusMap.get(item.id) !== item.status,
  );
  if (statusChanges.length > 0) {
    await Promise.all(
      statusChanges.map((item) =>
        logTaskEvent({
          taskId: item.id,
          actorId: session.userId,
          type: "status_changed",
          oldValue: statusMap.get(item.id),
          newValue: item.status,
        }),
      ),
    );
  }

  return NextResponse.json({ success: true });
}
