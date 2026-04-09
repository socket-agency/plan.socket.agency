import { Resend } from "resend";
import { db } from "@/db";
import {
  users,
  tasks,
  sentEmails,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/db/schema";
import type {
  TaskEventType,
  UserRole,
  NotificationPrefs,
  User,
} from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { EventNotification } from "@/emails/event-notification";
import { ActivityDigest } from "@/emails/activity-digest";
import type { DigestTaskGroup } from "@/emails/activity-digest";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function fromEmail() {
  return process.env.NOTIFICATION_FROM_EMAIL ?? "onboarding@resend.dev";
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://plan.socket.agency";
}

function preferencesUrl() {
  return `${appUrl()}/settings?tab=notifications`;
}

function taskUrl(taskId: string) {
  return `${appUrl()}?task=${taskId}`;
}

// --- Event notification routing ---

const OWNER_NOTIFIABLE_EVENTS: TaskEventType[] = [
  "comment_added",
  "task_created",
  "attachment_added",
];

const CLIENT_NOTIFIABLE_EVENTS: TaskEventType[] = [
  "status_changed",
  "comment_added",
  "assignee_changed",
  "reviewer_changed",
  "task_created",
];

function getRecipientRole(
  actorRole: UserRole,
  eventType: TaskEventType,
): UserRole | null {
  if (
    actorRole === "client" &&
    OWNER_NOTIFIABLE_EVENTS.includes(eventType)
  ) {
    return "owner";
  }
  if (
    actorRole === "owner" &&
    CLIENT_NOTIFIABLE_EVENTS.includes(eventType)
  ) {
    return "client";
  }
  return null;
}

function resolvePrefs(user: User): NotificationPrefs {
  return user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS[user.role];
}

// --- Event descriptions ---

const EVENT_DESCRIPTIONS: Record<
  string,
  (oldValue: unknown, newValue: unknown) => string
> = {
  comment_added: () => "added a comment",
  task_created: () => "created this task",
  attachment_added: (_o, n) =>
    `attached ${(n as { filename?: string })?.filename ?? "a file"}`,
  status_changed: (o, n) => `changed status from ${o} to ${n}`,
  assignee_changed: (o, n) => `changed assignee from ${o} to ${n}`,
  reviewer_changed: (_o, n) => n ? `set reviewer to ${n}` : "removed the reviewer",
};

function buildActionDescription(
  eventType: TaskEventType,
  oldValue: unknown,
  newValue: unknown,
): string {
  const builder = EVENT_DESCRIPTIONS[eventType];
  return builder ? builder(oldValue, newValue) : `updated the task`;
}

function buildSubject(
  eventType: TaskEventType,
  taskTitle: string,
): string {
  const prefixes: Record<string, string> = {
    comment_added: "New comment on",
    task_created: "New task",
    attachment_added: "New attachment on",
    status_changed: "Task updated",
    assignee_changed: "Task assigned",
    reviewer_changed: "Reviewer updated",
  };
  const prefix = prefixes[eventType] ?? "Update on";
  return `${prefix}: ${taskTitle}`;
}

// --- Core send functions ---

interface LogEventParams {
  taskId: string;
  actorId: string | null;
  type: TaskEventType;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export async function sendNotificationForEvent(params: LogEventParams) {
  const { taskId, actorId, type, oldValue, newValue, metadata } = params;

  if (!actorId) return;

  const [actor] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  if (!actor) return;

  const recipientRole = getRecipientRole(actor.role, type);
  if (!recipientRole) return;

  const recipients = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, recipientRole),
        ne(users.id, actorId),
      ),
    );

  const eligibleRecipients = recipients.filter(
    (u) => resolvePrefs(u).emailEnabled,
  );

  if (eligibleRecipients.length === 0) return;

  const [task] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) return;

  const actionDescription = buildActionDescription(type, oldValue, newValue);
  const subject = buildSubject(type, task.title);
  const contentPreview =
    type === "comment_added"
      ? ((metadata as { body?: string })?.body ??
        (newValue as string) ??
        ""
      ).slice(0, 200)
      : undefined;

  for (const recipient of eligibleRecipients) {
    try {
      const result = await getResend().emails.send({
        from: `Plan <${fromEmail()}>`,
        to: recipient.email,
        subject,
        react: EventNotification({
          actorName: actor.name,
          actionDescription,
          taskTitle: task.title,
          contentPreview,
          taskUrl: taskUrl(task.id),
          appUrl: appUrl(),
          preferencesUrl: preferencesUrl(),
        }),
      });

      await db.insert(sentEmails).values({
        userId: recipient.id,
        type: "event",
        subject,
        resendId: result.data?.id ?? null,
        taskId: task.id,
        eventType: type,
      });
    } catch (error) {
      console.error(
        `Failed to send notification to ${recipient.email}:`,
        error,
      );
    }
  }
}

// --- Digest send ---

export interface DigestEventRow {
  taskId: string;
  taskTitle: string;
  actorName: string;
  type: TaskEventType;
  oldValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export async function sendDigestEmail(
  recipient: User,
  events: DigestEventRow[],
) {
  const taskGroups = new Map<string, DigestTaskGroup>();

  for (const event of events) {
    let group = taskGroups.get(event.taskId);
    if (!group) {
      group = {
        taskTitle: event.taskTitle,
        taskUrl: taskUrl(event.taskId),
        items: [],
      };
      taskGroups.set(event.taskId, group);
    }

    group.items.push({
      actorName: event.actorName,
      description: buildActionDescription(
        event.type,
        event.oldValue,
        event.newValue,
      ),
      timestamp: event.createdAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  const taskList = Array.from(taskGroups.values());
  if (taskList.length === 0) return;

  const earliest = events[0].createdAt;
  const latest = events[events.length - 1].createdAt;
  const dateRange = `${earliest.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} — ${latest.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const subject = `Activity digest — ${dateRange}`;

  try {
    const result = await getResend().emails.send({
      from: `Plan <${fromEmail()}>`,
      to: recipient.email,
      subject,
      react: ActivityDigest({
        dateRange,
        tasks: taskList,
        boardUrl: appUrl(),
        appUrl: appUrl(),
        preferencesUrl: preferencesUrl(),
      }),
    });

    await db.insert(sentEmails).values({
      userId: recipient.id,
      type: "digest",
      subject,
      resendId: result.data?.id ?? null,
    });
  } catch (error) {
    console.error(
      `Failed to send digest to ${recipient.email}:`,
      error,
    );
  }
}
