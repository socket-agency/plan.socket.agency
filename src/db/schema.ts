import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

export const userRoles = ["owner", "client"] as const;
export type UserRole = (typeof userRoles)[number];

export const taskStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskAssignees = ["agency", "client"] as const;
export type TaskAssignee = (typeof taskAssignees)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("client"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: taskStatuses }).notNull().default("backlog"),
  priority: text("priority", { enum: taskPriorities })
    .notNull()
    .default("medium"),
  assignee: text("assignee", { enum: taskAssignees })
    .notNull()
    .default("agency"),
  position: integer("position").notNull().default(0),
  dueDate: date("due_date"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
