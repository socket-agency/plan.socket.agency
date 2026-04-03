export type {
  Task,
  Comment,
  User,
  Attachment,
  TaskStatus,
  TaskPriority,
  TaskAssignee,
  UserRole,
} from "@/db/schema";

export { taskStatuses, taskPriorities, taskAssignees } from "@/db/schema";

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
