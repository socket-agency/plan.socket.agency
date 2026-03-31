"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { Column } from "./column";
import { TaskCard } from "./card";
import type { Task, TaskStatus } from "@/db/schema";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

interface BoardProps {
  initialTasks: Task[];
  isOwner: boolean;
  onAddTask?: (status: TaskStatus) => void;
}

export function Board({ initialTasks, isOwner, onAddTask }: BoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position),
    [tasks]
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeTaskObj = tasks.find((t) => t.id === activeTaskId);
    if (!activeTaskObj) return;

    const targetColumn = columns.find((c) => c.status === overId);
    if (targetColumn && activeTaskObj.status !== targetColumn.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTaskId ? { ...t, status: targetColumn.status } : t
        )
      );
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTaskObj.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTaskId ? { ...t, status: overTask.status } : t
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    const status = activeTaskObj.status;
    const columnTasks = getTasksByStatus(status);

    if (activeId !== overId) {
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const items = reordered.map((t, i) => ({
          id: t.id,
          status,
          position: (i + 1) * 1000,
        }));

        setTasks((prev) =>
          prev.map((t) => {
            const item = items.find((it) => it.id === t.id);
            return item
              ? { ...t, status: item.status, position: item.position }
              : t;
          })
        );

        await fetch("/api/tasks/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        return;
      }
    }

    const updatedColumnTasks = getTasksByStatus(status);
    const items = updatedColumnTasks.map((t, i) => ({
      id: t.id,
      status,
      position: (i + 1) * 1000,
    }));

    await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Board</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {tasks.length} tasks
          </p>
        </div>

        {/* Columns */}
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {columns.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={getTasksByStatus(col.status)}
              isOwner={isOwner}
              onTaskClick={(task) => router.push(`/tasks/${task.id}`)}
              onAddTask={onAddTask}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragDisabled /> : null}
      </DragOverlay>
    </DndContext>
  );
}
