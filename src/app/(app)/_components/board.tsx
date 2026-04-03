"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import { useTasks } from "@/hooks/use-tasks";
import type { Task, TaskStatus } from "@/lib/types";
import { taskStatuses } from "@/lib/types";
import { EmberColumn } from "./column";
import { EmberTaskCard } from "./task-card";
import { EmberTaskDetailModal } from "./task-detail-modal";
import { EmberAiChat } from "./ai-chat";
import { Plus, Sparkles } from "lucide-react";

export function EmberBoard({ initialTaskId }: { initialTaskId?: string }) {
  const { tasks, loading, reorder, fetchTasks, createTask } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialTaskId ?? null
  );
  const openTask = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
    const url = taskId ? `/tasks/${taskId}` : "/";
    window.history.pushState(null, "", url);
  }, []);

  const [chatOpen, setChatOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Create task state
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnTasks = useCallback(
    (status: TaskStatus) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position),
    [tasks]
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (!overId) {
      setOverColumnId(null);
      return;
    }
    if (taskStatuses.includes(overId as TaskStatus)) {
      setOverColumnId(overId);
    } else {
      const overTask = event.over?.data?.current?.task as Task | undefined;
      if (overTask) {
        setOverColumnId(overTask.status);
      }
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      setOverColumnId(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      let targetStatus: TaskStatus;
      let targetIndex: number;

      if (taskStatuses.includes(over.id as TaskStatus)) {
        targetStatus = over.id as TaskStatus;
        targetIndex = columnTasks(targetStatus).filter(
          (t) => t.id !== taskId
        ).length;
      } else {
        const overTask = over.data?.current?.task as Task | undefined;
        if (!overTask) return;
        targetStatus = overTask.status;
        const col = columnTasks(targetStatus).filter((t) => t.id !== taskId);
        targetIndex = col.findIndex((t) => t.id === overTask.id);
        if (targetIndex === -1) targetIndex = col.length;
      }

      const col = columnTasks(targetStatus).filter((t) => t.id !== taskId);
      col.splice(targetIndex, 0, task);
      const items = col.map((t, i) => ({
        id: t.id,
        status: targetStatus,
        position: (i + 1) * 1000,
      }));

      await reorder(items);
    },
    [tasks, reorder, columnTasks]
  );

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    try {
      await createTask({ title: newTaskTitle.trim() });
      setNewTaskTitle("");
      setShowCreateInput(false);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4453A] border-t-transparent" />
          <span className="text-sm text-[#9494A0]">Loading board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-[#F7F7F8]">Board</h1>
          <span className="rounded-full bg-[#252529] px-2.5 py-0.5 font-mono text-xs text-[#9494A0]">
            {tasks.length} tasks
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Create task */}
          {showCreateInput ? (
            <form onSubmit={handleCreateTask} className="flex items-center gap-2">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowCreateInput(false);
                    setNewTaskTitle("");
                  }
                }}
                placeholder="Task title..."
                className="w-56 rounded-lg border border-white/[0.06] bg-[#252529] px-3 py-1.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
                disabled={creating}
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-[#D4453A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#C03830]"
              >
                Add
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateInput(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[#131316] px-3 py-1.5 text-sm text-[#9494A0] transition-colors hover:border-[#D4453A]/30 hover:text-[#F7F7F8]"
            >
              <Plus size={15} />
              New Task
            </button>
          )}

          {/* AI Chat toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
              chatOpen
                ? "text-white"
                : "border border-white/[0.06] bg-[#131316] text-[#9494A0] hover:border-[#D4453A]/30 hover:text-[#F7F7F8]"
            }`}
            style={
              chatOpen
                ? {
                    background:
                      "linear-gradient(135deg, #D4453A, #F0A868)",
                  }
                : undefined
            }
          >
            <Sparkles size={15} />
            AI Chat
          </button>
        </div>
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {taskStatuses.map((status) => (
              <EmberColumn
                key={status}
                status={status}
                tasks={columnTasks(status)}
                onTaskClick={openTask}
                isDropTarget={overColumnId === status}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="w-[300px] rotate-2 opacity-90">
                <EmberTaskCard
                  task={activeTask}
                  onClick={() => {}}
                  isDragging
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail modal */}
      {selectedTaskId && (
        <EmberTaskDetailModal
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onClose={() => openTask(null)}
          onUpdate={fetchTasks}
        />
      )}

      {/* AI Chat drawer */}
      <EmberAiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
