"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Calendar, User, UserCheck, Flag, Layers, Trash2, Link, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTask } from "@/hooks/use-task";
import { useAuth } from "@/hooks/use-auth";
import { canEditTask } from "@/lib/permissions";
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
  const { user } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Permission derivation
  const isOwner = user?.role === "owner";
  const canEdit = user && task
    ? canEditTask({ userId: user.id, role: user.role }, task)
    : false;

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

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteTask();
    onUpdate();
    onClose();
  };

  const handleDueDateChange = async (value: string) => {
    await updateTask({ dueDate: value || null });
    setActivityKey((k) => k + 1);
    onUpdate();
  };

  // Title inline editing
  const startEditingTitle = () => {
    if (!canEdit || !task) return;
    setTitleDraft(task.title);
    setEditingTitle(true);
  };

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const saveTitle = async () => {
    if (!task || !editingTitle) return;
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      await updateTask({ title: trimmed });
      setActivityKey((k) => k + 1);
      onUpdate();
    }
  };

  const cancelTitleEdit = () => {
    setEditingTitle(false);
  };

  // Description inline editing
  const startEditingDescription = () => {
    if (!canEdit || !task) return;
    setDescriptionDraft(task.description ?? "");
    setEditingDescription(true);
  };

  useEffect(() => {
    if (editingDescription) descriptionRef.current?.focus();
  }, [editingDescription]);

  const saveDescription = async () => {
    if (!task) return;
    const value = descriptionDraft.trim() || null;
    if (value !== (task.description ?? null)) {
      await updateTask({ description: value });
      setActivityKey((k) => k + 1);
      onUpdate();
    }
    setEditingDescription(false);
  };

  const cancelDescriptionEdit = () => {
    setEditingDescription(false);
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
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") cancelTitleEdit();
                  }}
                  className="w-full rounded-md border border-white/[0.06] bg-[#1C1C21] px-3 py-1.5 text-xl font-semibold text-[#F7F7F8] outline-none focus:border-[#D4453A] focus:ring-1 focus:ring-[#D4453A]/30"
                />
              ) : (
                <DialogTitle
                  className={`text-xl font-semibold text-[#F7F7F8] ${canEdit ? "group/title cursor-pointer rounded-md px-1 -mx-1 transition-colors hover:bg-white/[0.03]" : ""}`}
                  onClick={startEditingTitle}
                >
                  <span className="flex items-center gap-2">
                    {task.title}
                    {canEdit && (
                      <Pencil size={13} className="shrink-0 text-[#55555F] opacity-0 transition-opacity group-hover/title:opacity-100" />
                    )}
                  </span>
                </DialogTitle>
              )}
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
              {/* Status — only owners can change */}
              <MetaChip icon={<Layers size={13} />} label="Status">
                {isOwner ? (
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
                ) : (
                  <span className="text-xs font-medium text-[#F7F7F8]">
                    {statusLabels[task.status]}
                  </span>
                )}
              </MetaChip>

              {/* Priority */}
              <MetaChip icon={<Flag size={13} />} label="Priority">
                {canEdit ? (
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
                ) : (
                  <span className="text-xs font-medium text-[#F7F7F8]">
                    {priorityLabels[task.priority]}
                  </span>
                )}
              </MetaChip>

              {/* Assignee */}
              <MetaChip icon={<User size={13} />} label="Assignee">
                {canEdit ? (
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
                ) : (
                  <span className="text-xs font-medium text-[#F7F7F8]">
                    {task.assignee === "agency" ? "Agency" : "Client"}
                  </span>
                )}
              </MetaChip>

              {/* Reviewer */}
              <MetaChip icon={<UserCheck size={13} />} label="Reviewer">
                {canEdit ? (
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
                ) : (
                  <span className="text-xs font-medium text-[#F7F7F8]">
                    {task.reviewer ? (task.reviewer === "agency" ? "Agency" : "Client") : "None"}
                  </span>
                )}
              </MetaChip>

              {/* Due date */}
              {canEdit ? (
                <MetaChip icon={<Calendar size={13} />} label="Due">
                  <input
                    type="date"
                    value={task.dueDate ?? ""}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="cursor-pointer bg-transparent text-xs font-medium text-[#F0A868] outline-none [color-scheme:dark]"
                  />
                </MetaChip>
              ) : task.dueDate ? (
                <MetaChip icon={<Calendar size={13} />} label="Due">
                  <span className="text-xs font-medium text-[#F0A868]">
                    {task.dueDate}
                  </span>
                </MetaChip>
              ) : null}
            </div>

            {/* Body */}
            <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
              {/* Description */}
              {editingDescription ? (
                <div className="mb-6">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#55555F]">
                    Description
                  </h4>
                  <textarea
                    ref={descriptionRef}
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveDescription();
                      if (e.key === "Escape") cancelDescriptionEdit();
                    }}
                    rows={6}
                    placeholder="Add a description (markdown supported)..."
                    className="w-full resize-y rounded-md border border-white/[0.06] bg-[#1C1C21] px-3 py-2 text-sm leading-relaxed text-[#F7F7F8] placeholder:text-[#55555F] outline-none focus:border-[#D4453A] focus:ring-1 focus:ring-[#D4453A]/30"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={saveDescription}
                      className="rounded-md bg-[#D4453A] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#C03830]"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelDescriptionEdit}
                      className="rounded-md px-3 py-1 text-xs text-[#9494A0] transition-colors hover:text-[#F7F7F8]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : task.description ? (
                <div
                  className={`group/desc mb-6 ${canEdit ? "cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-white/[0.03]" : ""}`}
                  onClick={startEditingDescription}
                >
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#55555F]">
                    Description
                    {canEdit && (
                      <Pencil size={11} className="opacity-0 transition-opacity group-hover/desc:opacity-100" />
                    )}
                  </h4>
                  <Markdown className="text-sm leading-relaxed text-[#9494A0]">
                    {task.description}
                  </Markdown>
                </div>
              ) : canEdit ? (
                <button
                  onClick={startEditingDescription}
                  className="mb-6 flex items-center gap-2 rounded-md border border-dashed border-white/[0.06] px-3 py-2 text-xs text-[#55555F] transition-colors hover:border-[#D4453A]/30 hover:text-[#9494A0]"
                >
                  <Pencil size={11} />
                  Add description...
                </button>
              ) : null}

              {/* Attachments */}
              <TaskAttachments taskId={taskId} />

              {/* Activity timeline (events + comments) */}
              <TaskActivity taskId={taskId} refreshKey={activityKey} />
            </div>

            {/* Footer actions */}
            {canEdit && (
              <div className="flex justify-end border-t border-white/[0.06] px-6 py-3">
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9494A0]">Delete this task?</span>
                    <button
                      onClick={handleDelete}
                      className="rounded-md bg-[#D4453A] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#C03830]"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-md px-2.5 py-1 text-xs text-[#9494A0] transition-colors hover:text-[#F7F7F8]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#55555F] transition-colors hover:bg-[rgba(212,69,58,0.08)] hover:text-[#D4453A]"
                  >
                    <Trash2 size={13} />
                    Delete task
                  </button>
                )}
              </div>
            )}
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
