import type { TaskStatus, TaskPriority, TaskAssignee } from "@/lib/types";

export const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const statusColors: Record<TaskStatus, string> = {
  backlog: "#55555F",
  todo: "#9494A0",
  in_progress: "#3B82F6",
  in_review: "#F0A868",
  done: "#34D399",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const priorityColors: Record<TaskPriority, string> = {
  low: "#55555F",
  medium: "#9494A0",
  high: "#D4453A",
  urgent: "#FF4444",
};

export const assigneeLabels: Record<TaskAssignee, string> = {
  agency: "Agency",
  client: "Client",
};

export const assigneeColors: Record<TaskAssignee, string> = {
  agency: "#D4453A",
  client: "#F0A868",
};
