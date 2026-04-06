export type {
  Task,
  Comment,
  User,
  Attachment,
  TaskStatus,
  TaskPriority,
  TaskAssignee,
  TaskEventType,
  UserRole,
} from "@/db/schema";

export { taskStatuses, taskPriorities, taskAssignees } from "@/db/schema";

export interface TaskEventWithActor {
  id: string;
  type: TaskEventType;
  oldValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: "owner" | "client" | null;
}

export interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole: "owner" | "client";
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "client";
}
