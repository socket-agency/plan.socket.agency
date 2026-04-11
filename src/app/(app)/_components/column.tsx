"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, TaskStatus } from "@/lib/types";
import { statusLabels, statusColors } from "@/lib/task-config";
import { EmberTaskCard } from "./task-card";

function SortableTaskCard({
  task,
  onClick,
  isDraggable = true,
}: {
  task: Task;
  onClick: () => void;
  isDraggable?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(isDraggable ? listeners : {})}>
      <EmberTaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

export function EmberColumn({
  status,
  tasks,
  onTaskClick,
  isDropTarget,
  isDraggable = true,
}: {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  isDropTarget?: boolean;
  isDraggable?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#131316] px-4 py-2.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColors[status] }}
        />
        <span className="text-sm font-medium text-[#F7F7F8]">
          {statusLabels[status]}
        </span>
        <span className="ml-auto rounded-full bg-[#252529] px-2 py-0.5 font-mono text-[10px] text-[#9494A0]">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg p-1 min-h-[120px] transition-colors ${
          isDropTarget ? "bg-[rgba(212,69,58,0.04)]" : ""
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              isDraggable={isDraggable}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
