"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/types";

export function useTask(taskId: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Task not found");
      const data = await res.json();
      setTask(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateTask = useCallback(
    async (updates: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "assignee" | "dueDate">>) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTask(updated);
      return updated as Task;
    },
    [taskId]
  );

  const deleteTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
  }, [taskId]);

  return { task, loading, error, fetchTask, updateTask, deleteTask };
}
