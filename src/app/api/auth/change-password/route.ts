import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import {
  hashPassword,
  verifyPassword,
  invalidateUserSessions,
  createSession,
} from "@/lib/auth";
import { eq } from "drizzle-orm";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.id, auth.session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isValid = await verifyPassword(user.password, currentPassword);
  if (!isValid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, auth.session.userId));

  // Invalidate all existing sessions
  await invalidateUserSessions(auth.session.userId);

  // Re-issue a session for the current user
  const [updatedUser] = await db
    .select({ id: users.id, role: users.role, tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.id, auth.session.userId))
    .limit(1);

  if (updatedUser) {
    await createSession(updatedUser);
  }

  return NextResponse.json({ success: true });
}
