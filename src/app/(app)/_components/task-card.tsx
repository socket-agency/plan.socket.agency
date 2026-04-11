"use client";

import type { Task } from "@/lib/types";
import { priorityColors } from "@/lib/task-config";

const priorityLabelsShort: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "Urgent",
};

function relativeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays}d`;
}

export function EmberTaskCard({
  task,
  onClick,
  isDragging,
}: {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const due = relativeDate(task.dueDate);
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "done";

  const assigneeInitial = task.assignee === "agency" ? "A" : "C";

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border border-white/[0.06] bg-[#131316] p-3 transition-all hover:border-white/[0.1] hover:shadow-md hover:shadow-black/20 ${
        isDragging ? "opacity-50 shadow-lg shadow-black/40" : ""
      } ${task.status === "done" ? "opacity-60" : ""}`}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: priorityColors[task.priority],
      }}
    >
      {/* Title */}
      <p className="text-sm leading-snug text-[#F7F7F8]">
        {task.title}
      </p>

      {/* Meta row */}
      <div className="mt-2.5 flex items-center gap-2">
        {/* Priority badge */}
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
          style={{
            color: priorityColors[task.priority],
            backgroundColor: `${priorityColors[task.priority]}15`,
          }}
        >
          {priorityLabelsShort[task.priority]}
        </span>

        {/* Assignee avatar */}
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
            task.assignee === "agency"
              ? "bg-[rgba(212,69,58,0.12)] text-[#D4453A]"
              : "bg-[rgba(240,168,104,0.12)] text-[#F0A868]"
          }`}
        >
          {assigneeInitial}
        </div>

        {/* Reviewer avatar */}
        {task.reviewer && (
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border border-dashed text-[10px] font-medium ${
              task.reviewer === "agency"
                ? "border-[#D4453A]/40 text-[#D4453A]"
                : "border-[#F0A868]/40 text-[#F0A868]"
            }`}
          >
            {task.reviewer === "agency" ? "A" : "C"}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Due date */}
        {due && (
          <span
            className={`font-mono text-[10px] ${
              isOverdue ? "text-[#D4453A]" : "text-[#F0A868]"
            }`}
          >
            {due}
          </span>
        )}
      </div>
    </div>
  );
}
