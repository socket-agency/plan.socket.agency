import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, userRoles } from "@/db/schema";
import { requireOwner } from "@/lib/api-auth";
import { hashPassword, invalidateUserSessions } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(500),
  password: z.string().min(8).max(200),
  role: z.enum(userRoles),
});

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.isDeleted, false))
    .orderBy(users.createdAt);

  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, email, password, role } = parsed.data;

  // Check for existing email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({ name, email, password: hashedPassword, role })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  // Prevent self-deletion
  if (id === auth.session.userId) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const [deactivated] = await db
    .update(users)
    .set({ isDeleted: true })
    .where(and(eq(users.id, id), eq(users.isDeleted, false)))
    .returning({ id: users.id });

  if (!deactivated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await invalidateUserSessions(id);

  return NextResponse.json({ success: true });
}
