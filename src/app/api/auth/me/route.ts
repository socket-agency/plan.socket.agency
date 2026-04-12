import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, DEFAULT_NOTIFICATION_PREFS } from "@/db/schema";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { eq, and, ne } from "drizzle-orm";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(500).optional(),
  currentPassword: z.string().optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      notificationPrefs:
        user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS[user.role],
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, email, currentPassword } = parsed.data;
  if (!name && !email) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  // Require current password when changing email
  if (email) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to change email" },
        { status: 400 }
      );
    }
    const [userWithPassword] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, auth.session.userId))
      .limit(1);

    if (!userWithPassword || !(await verifyPassword(userWithPassword.password, currentPassword))) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 }
      );
    }
  }

  // Check email uniqueness if changing email
  if (email) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, auth.session.userId)))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
  }

  const setValues: Record<string, string> = {};
  if (name) setValues.name = name;
  if (email) setValues.email = email;

  try {
    const [updated] = await db
      .update(users)
      .set(setValues)
      .where(eq(users.id, auth.session.userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        notificationPrefs: users.notificationPrefs,
      });

    return NextResponse.json({
      user: {
        ...updated,
        notificationPrefs:
          updated.notificationPrefs ??
          DEFAULT_NOTIFICATION_PREFS[updated.role],
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
