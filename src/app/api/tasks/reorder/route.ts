import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tasks, taskStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/api-auth";

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
  const { error } = await requireOwner();
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

  return NextResponse.json({ success: true });
}
