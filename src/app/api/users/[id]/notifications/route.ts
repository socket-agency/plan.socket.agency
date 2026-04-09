import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, DEFAULT_NOTIFICATION_PREFS } from "@/db/schema";
import type { NotificationPrefs } from "@/db/schema";
import { requireOwner } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

const updatePrefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  digestIntervalHours: z.number().min(1).max(720).nullable().optional(),
  digestHourUtc: z.number().int().min(0).max(23).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { id: targetUserId } = await params;

  const body = await request.json();
  const parsed = updatePrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const [targetUser] = await db
    .select({
      notificationPrefs: users.notificationPrefs,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentPrefs: NotificationPrefs =
    targetUser.notificationPrefs ??
    DEFAULT_NOTIFICATION_PREFS[targetUser.role];

  const updatedPrefs: NotificationPrefs = {
    ...currentPrefs,
    ...Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ),
  };

  await db
    .update(users)
    .set({ notificationPrefs: updatedPrefs })
    .where(eq(users.id, targetUserId));

  return NextResponse.json({ notificationPrefs: updatedPrefs });
}
