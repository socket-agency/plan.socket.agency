"use client";

import { useState, useCallback } from "react";
import { Calendar, User, UserCheck, Flag, Layers, Trash2, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTask } from "@/hooks/use-task";
import { TaskAttachments } from "./task-attachments";
import { TaskActivity } from "./task-activity";
import { Markdown } from "@/components/ui/markdown";
import type { TaskStatus, TaskPriority, TaskAssignee } from "@/lib/types";
import { taskStatuses, taskPriorities, taskAssignees } from "@/lib/types";

const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function EmberTaskDetailModal({
  taskId,
  open,
  onClose,
  onUpdate,
}: {
  taskId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { task, loading, updateTask, deleteTask } = useTask(taskId);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/tasks/${taskId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [taskId]);

  const handleStatusChange = async (status: TaskStatus) => {
    await updateTask({ status });
    setActivityKey((k) => k + 1);
    onUpdate();
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    await updateTask({ priority });
    setActivityKey((k) => k + 1);
    onUpdate();
  };

  const handleAssigneeChange = async (assignee: TaskAssignee) => {
    await updateTask({ assignee });
    setActivityKey((k) => k + 1);
    onUpdate();
  };

  const handleReviewerChange = async (reviewer: TaskAssignee | "") => {
    await updateTask({ reviewer: reviewer || null });
    setActivityKey((k) => k + 1);
    onUpdate();
  };

  const handleDelete = async () => {
    await deleteTask();
    onUpdate();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[640px] rounded-xl border border-white/[0.06] bg-[#131316] p-0 backdrop-blur-md sm:max-w-[640px]"
        showCloseButton
      >
        {loading || !task ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4453A] border-t-transparent" />
              <span className="text-sm text-[#9494A0]">Loading task...</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <DialogHeader className="border-b border-white/[0.06] p-6 pr-12 pb-4">
              <DialogTitle className="text-xl font-semibold text-[#F7F7F8]">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <DialogDescription className="text-sm text-[#9494A0]">
                  Created {new Date(task.createdAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </DialogDescription>
                <span className="text-[#55555F]">·</span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-xs text-[#55555F] transition-colors hover:text-[#9494A0]"
                >
                  <Link size={11} />
                  {linkCopied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </DialogHeader>

            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-3">
              {/* Status */}
              <MetaChip icon={<Layers size={13} />} label="Status">
                <select
                  value={task.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as TaskStatus)
                  }
                  className="cursor-pointer bg-transparent text-xs font-medium text-[#F7F7F8] outline-none"
                >
                  {taskStatuses.map((s) => (
                    <option key={s} value={s} className="bg-[#1C1C21]">
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </MetaChip>

              {/* Priority */}
              <MetaChip icon={<Flag size={13} />} label="Priority">
                <select
                  value={task.priority}
                  onChange={(e) =>
                    handlePriorityChange(e.target.value as TaskPriority)
                  }
                  className="cursor-pointer bg-transparent text-xs font-medium text-[#F7F7F8] outline-none"
                >
                  {taskPriorities.map((p) => (
                    <option key={p} value={p} className="bg-[#1C1C21]">
                      {priorityLabels[p]}
                    </option>
                  ))}
                </select>
              </MetaChip>

              {/* Assignee */}
              <MetaChip icon={<User size={13} />} label="Assignee">
                <select
                  value={task.assignee}
                  onChange={(e) =>
                    handleAssigneeChange(e.target.value as TaskAssignee)
                  }
                  className="cursor-pointer bg-transparent text-xs font-medium text-[#F7F7F8] outline-none"
                >
                  {taskAssignees.map((a) => (
                    <option key={a} value={a} className="bg-[#1C1C21]">
                      {a === "agency" ? "Agency" : "Client"}
                    </option>
                  ))}
                </select>
              </MetaChip>

              {/* Reviewer */}
              <MetaChip icon={<UserCheck size={13} />} label="Reviewer">
                <select
                  value={task.reviewer ?? ""}
                  onChange={(e) =>
                    handleReviewerChange(e.target.value as TaskAssignee | "")
                  }
                  className="cursor-pointer bg-transparent text-xs font-medium text-[#F7F7F8] outline-none"
                >
                  <option value="" className="bg-[#1C1C21]">
                    None
                  </option>
                  {taskAssignees.map((a) => (
                    <option key={a} value={a} className="bg-[#1C1C21]">
                      {a === "agency" ? "Agency" : "Client"}
                    </option>
                  ))}
                </select>
              </MetaChip>

              {/* Due date */}
              {task.dueDate && (
                <MetaChip icon={<Calendar size={13} />} label="Due">
                  <span className="text-xs font-medium text-[#F0A868]">
                    {task.dueDate}
                  </span>
                </MetaChip>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
              {/* Description */}
              {task.description && (
                <div className="mb-6">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#55555F]">
                    Description
                  </h4>
                  <Markdown className="text-sm leading-relaxed text-[#9494A0]">
                    {task.description}
                  </Markdown>
                </div>
              )}

              {/* Attachments */}
              <TaskAttachments taskId={taskId} />

              {/* Activity timeline (events + comments) */}
              <TaskActivity taskId={taskId} refreshKey={activityKey} />
            </div>

            {/* Footer actions */}
            <div className="flex justify-end border-t border-white/[0.06] px-6 py-3">
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#55555F] transition-colors hover:bg-[rgba(212,69,58,0.08)] hover:text-[#D4453A]"
              >
                <Trash2 size={13} />
                Delete task
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaChip({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-[#1C1C21] px-2.5 py-1.5">
      <span className="text-[#55555F]">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-[#55555F]">
        {label}
      </span>
      {children}
    </div>
  );
}
