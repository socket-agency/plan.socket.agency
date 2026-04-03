import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const [deleted] = await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.userId)),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  return new Response(null, { status: 204 });
}
