"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isOwner: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function Column({
  status,
  label,
  tasks,
  isOwner,
  onTaskClick,
  onAddTask,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-0 transition-all duration-150",
        isOver && "border-brand/30 glow-brand"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2.5">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-surface-2 px-1 font-mono text-[10px] tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-brand"
            onClick={() => onAddTask(status)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragDisabled={!isOwner}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/40">
              No tasks
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
