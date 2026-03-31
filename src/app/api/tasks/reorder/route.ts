import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/api-auth";

interface ReorderItem {
  id: string;
  status: string;
  position: number;
}

export async function PATCH(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  const { items }: { items: ReorderItem[] } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "items array is required" },
      { status: 400 }
    );
  }

  await Promise.all(
    items.map((item) =>
      db
        .update(tasks)
        .set({
          status: item.status as typeof tasks.$inferSelect.status,
          position: item.position,
        })
        .where(eq(tasks.id, item.id))
    )
  );

  return NextResponse.json({ success: true });
}
