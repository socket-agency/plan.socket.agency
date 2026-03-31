"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/db/schema";

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const priorityColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
};

const assigneeColors: Record<string, string> = {
  agency: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  client: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("title")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant="secondary" className="text-xs">
          {statusLabels[status] || status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <Badge
          variant="outline"
          className={`capitalize text-xs ${priorityColors[priority] || ""}`}
        >
          {priority}
        </Badge>
      );
    },
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) => {
      const assignee = row.getValue("assignee") as string;
      return (
        <Badge
          variant="outline"
          className={`capitalize text-xs ${assigneeColors[assignee] || ""}`}
        >
          {assignee}
        </Badge>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.getValue("dueDate") as string | null;
      if (!date) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm">
          {new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    },
  },
];
