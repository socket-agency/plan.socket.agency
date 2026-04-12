import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys, userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/api-auth";
import { generateApiKey } from "@/lib/mcp/auth";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(userRoles),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  const { session, error } = await requireOwner();
  if (error) return error;

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      role: apiKeys.role,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.userId));

  return NextResponse.json(keys);
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
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { raw, hash, prefix } = await generateApiKey();

  const [key] = await db
    .insert(apiKeys)
    .values({
      userId: session.userId,
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
      role: parsed.data.role,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      role: apiKeys.role,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
    });

  return NextResponse.json({ ...key, key: raw }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireOwner();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing id parameter" },
      { status: 400 }
    );
  }

  const [key] = await db
    .select({ userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1);

  if (!key || key.userId !== session.userId) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return NextResponse.json({ success: true });
}
