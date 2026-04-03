import { NextResponse } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { error } = await requireAuth();
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

  const result = await get(attachment.url, { access: "private" });

  if (!result || result.statusCode !== 200) {
    return NextResponse.json(
      { error: "File not found in storage" },
      { status: 404 }
    );
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Disposition": `inline; filename="${attachment.filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
