"use client";

import { useState, useCallback } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { taskStatuses } from "@/lib/types";

export function useBoardDnd(
  tasks: Task[],
  reorder: (items: { id: string; status: TaskStatus; position: number }[]) => Promise<void>
) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns: Record<TaskStatus, Task[]> = Object.fromEntries(
    taskStatuses.map((status) => [
      status,
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position),
    ])
  ) as Record<TaskStatus, Task[]>;

  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId) ?? null
    : null;

  const handleDragStart = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDragEnd = useCallback(
    async (
      taskId: string,
      targetStatus: TaskStatus,
      targetIndex: number
    ) => {
      setActiveId(null);

      const targetColumn = columns[targetStatus].filter(
        (t) => t.id !== taskId
      );

      const items: { id: string; status: TaskStatus; position: number }[] = [];

      // Insert at target index, recalculate positions with 1000-gap
      targetColumn.splice(targetIndex, 0, { id: taskId } as Task);
      targetColumn.forEach((t, i) => {
        items.push({
          id: t.id,
          status: targetStatus,
          position: (i + 1) * 1000,
        });
      });

      await reorder(items);
    },
    [columns, reorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return {
    columns,
    activeId,
    activeTask,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
