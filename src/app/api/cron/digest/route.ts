import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, taskEvents, DEFAULT_NOTIFICATION_PREFS } from "@/db/schema";
import type { User, NotificationPrefs } from "@/db/schema";
import { eq, ne, and, gt, aliasedTable } from "drizzle-orm";
import { sendDigestEmail } from "@/lib/notifications";
import type { DigestEventRow } from "@/lib/notifications";

const actors = aliasedTable(users, "actors");

function resolvePrefs(user: User): NotificationPrefs {
  return user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS[user.role];
}

function isDigestDue(user: User, nowUtcHour: number): boolean {
  const prefs = resolvePrefs(user);
  if (prefs.digestIntervalHours == null) return false;

  // Check if the delivery hour has been reached
  if (nowUtcHour < prefs.digestHourUtc) return false;

  // Check if enough time has elapsed since last digest
  if (user.lastDigestSentAt) {
    const elapsed = Date.now() - user.lastDigestSentAt.getTime();
    const intervalMs = prefs.digestIntervalHours * 60 * 60 * 1000;
    if (elapsed < intervalMs) return false;
  }

  return true;
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this automatically)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowUtcHour = new Date().getUTCHours();

  const allUsers = await db.select().from(users);
  const dueUsers = allUsers.filter((u) => isDigestDue(u, nowUtcHour));

  let sent = 0;

  for (const user of dueUsers) {
    const since = user.lastDigestSentAt ?? new Date(0);

    // Fetch events since last digest, excluding user's own actions
    const events = await db
      .select({
        taskId: taskEvents.taskId,
        taskTitle: tasks.title,
        actorName: actors.name,
        type: taskEvents.type,
        oldValue: taskEvents.oldValue,
        newValue: taskEvents.newValue,
        metadata: taskEvents.metadata,
        createdAt: taskEvents.createdAt,
      })
      .from(taskEvents)
      .innerJoin(tasks, eq(taskEvents.taskId, tasks.id))
      .innerJoin(actors, eq(taskEvents.actorId, actors.id))
      .where(
        and(
          gt(taskEvents.createdAt, since),
          ne(taskEvents.actorId, user.id),
        ),
      )
      .orderBy(taskEvents.createdAt);

    if (events.length === 0) continue;

    await sendDigestEmail(
      user,
      events as DigestEventRow[],
    );

    // Update lastDigestSentAt
    await db
      .update(users)
      .set({ lastDigestSentAt: new Date() })
      .where(eq(users.id, user.id));

    sent++;
  }

  return NextResponse.json({
    processed: dueUsers.length,
    sent,
  });
}
