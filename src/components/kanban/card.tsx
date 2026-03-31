"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import type { Task } from "@/db/schema";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  isDragDisabled?: boolean;
  onClick?: () => void;
}

const priorityConfig: Record<string, { class: string; dot: string }> = {
  low: { class: "text-emerald-400", dot: "bg-emerald-400" },
  medium: { class: "text-amber-400", dot: "bg-amber-400" },
  high: { class: "text-orange-400", dot: "bg-orange-400" },
  urgent: { class: "text-brand", dot: "bg-brand" },
};

const assigneeConfig: Record<string, string> = {
  agency: "bg-surface-3 text-foreground",
  client: "bg-brand/10 text-brand",
};

export function TaskCard({ task, isDragDisabled, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDragDisabled ? {} : listeners)}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-surface-1 p-3 transition-all duration-150",
        "hover:border-brand/20 hover:bg-surface-2",
        isDragging && "opacity-40",
        !isDragDisabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      <p className="text-sm font-medium leading-snug text-foreground">
        {task.title}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* Priority dot + label */}
        <span className={cn("flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider", priority.class)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
          {task.priority}
        </span>

        {/* Assignee badge */}
        <Badge
          variant="secondary"
          className={cn("border-0 px-1.5 py-0 font-mono text-[10px] uppercase tracking-wider", assigneeConfig[task.assignee])}
        >
          {task.assignee}
        </Badge>

        {/* Due date */}
        {task.dueDate && (
          <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
