import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, DEFAULT_NOTIFICATION_PREFS } from "@/db/schema";
import type { NotificationPrefs } from "@/db/schema";
import { requireAuth } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

const updatePrefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  digestIntervalHours: z.number().min(1).max(720).nullable().optional(),
  digestHourUtc: z.number().int().min(0).max(23).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const [user] = await db
    .select({
      notificationPrefs: users.notificationPrefs,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, auth.session.userId))
    .limit(1);

  const prefs =
    user?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS[auth.session.role];

  return NextResponse.json({ notificationPrefs: prefs });
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
  const parsed = updatePrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const [user] = await db
    .select({
      notificationPrefs: users.notificationPrefs,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, auth.session.userId))
    .limit(1);

  const currentPrefs: NotificationPrefs =
    user?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS[auth.session.role];

  const updatedPrefs: NotificationPrefs = {
    ...currentPrefs,
    ...Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ),
  };

  await db
    .update(users)
    .set({ notificationPrefs: updatedPrefs })
    .where(eq(users.id, auth.session.userId));

  return NextResponse.json({ notificationPrefs: updatedPrefs });
}
