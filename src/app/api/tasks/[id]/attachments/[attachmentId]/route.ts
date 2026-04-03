import { NextResponse } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { del } from "@vercel/blob";

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { attachmentId } = await params;

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!attachment) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 }
    );
  }

  // Only the uploader or an owner can delete
  if (
    attachment.uploadedBy !== session.userId &&
    session.role !== "owner"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await del(attachment.url);
  await db.delete(attachments).where(eq(attachments.id, attachmentId));

  return NextResponse.json({ success: true });
}
