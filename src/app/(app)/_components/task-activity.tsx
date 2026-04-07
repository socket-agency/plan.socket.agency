"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  ArrowRight,
  Flag,
  User,
  Calendar,
  Pencil,
  FileText,
  Paperclip,
  Trash2,
} from "lucide-react";
import { useTaskEvents } from "@/hooks/use-task-events";
import { useComments } from "@/hooks/use-comments";
import { Markdown } from "@/components/ui/markdown";
import type { TaskEventWithActor, CommentWithAuthor, TaskEventType } from "@/lib/types";

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const statusColors: Record<string, string> = {
  backlog: "#55555F",
  todo: "#9494A0",
  in_progress: "#3B82F6",
  in_review: "#F0A868",
  done: "#34D399",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityColors: Record<string, string> = {
  low: "#9494A0",
  medium: "#3B82F6",
  high: "#F0A868",
  urgent: "#D4453A",
};

const assigneeLabels: Record<string, string> = {
  agency: "Agency",
  client: "Client",
};

const assigneeColors: Record<string, string> = {
  agency: "#D4453A",
  client: "#F0A868",
};

type TimelineItem =
  | { kind: "event"; data: TaskEventWithActor }
  | { kind: "comment"; data: CommentWithAuthor };

const EVENT_ICONS: Record<TaskEventType, typeof Plus> = {
  task_created: Plus,
  status_changed: ArrowRight,
  priority_changed: Flag,
  assignee_changed: User,
  due_date_changed: Calendar,
  title_changed: Pencil,
  description_changed: FileText,
  comment_added: Paperclip, // not rendered (filtered out)
  attachment_added: Paperclip,
  attachment_removed: Trash2,
  task_deleted: Trash2,
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function EventDescription({ event }: { event: TaskEventWithActor }) {
  const actor = event.actorName ?? "Someone";
  const meta = event.metadata as Record<string, unknown> | null;

  switch (event.type) {
    case "task_created":
      return <><span className="font-medium text-[#F7F7F8]">{actor}</span> created this task</>;

    case "status_changed": {
      const newStatus = event.newValue as string;
      const color = statusColors[newStatus] ?? "#9494A0";
      return (
        <>
          <span className="font-medium text-[#F7F7F8]">{actor}</span>
          {" moved to "}
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-medium" style={{ color }}>
              {statusLabels[newStatus] ?? newStatus}
            </span>
          </span>
        </>
      );
    }

    case "priority_changed": {
      const newPriority = event.newValue as string;
      const pColor = priorityColors[newPriority] ?? "#9494A0";
      return (
        <>
          <span className="font-medium text-[#F7F7F8]">{actor}</span>
          {" changed priority to "}
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: pColor }}
            />
            <span className="font-medium" style={{ color: pColor }}>
              {priorityLabels[newPriority] ?? newPriority}
            </span>
          </span>
        </>
      );
    }

    case "assignee_changed": {
      const newAssignee = event.newValue as string;
      const aColor = assigneeColors[newAssignee] ?? "#9494A0";
      return (
        <>
          <span className="font-medium text-[#F7F7F8]">{actor}</span>
          {" reassigned to "}
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: aColor }}
            />
            <span className="font-medium" style={{ color: aColor }}>
              {assigneeLabels[newAssignee] ?? newAssignee}
            </span>
          </span>
        </>
      );
    }

    case "due_date_changed": {
      const newDate = event.newValue as string | null;
      if (!newDate) {
        return <><span className="font-medium text-[#F7F7F8]">{actor}</span> removed the due date</>;
      }
      return (
        <>
          <span className="font-medium text-[#F7F7F8]">{actor}</span>
          {" set due date to "}
          <span className="font-medium text-[#F0A868]">{newDate}</span>
        </>
      );
    }

    case "title_changed":
      return <><span className="font-medium text-[#F7F7F8]">{actor}</span> updated the title</>;

    case "description_changed":
      return <><span className="font-medium text-[#F7F7F8]">{actor}</span> updated the description</>;

    case "attachment_added": {
      const filename = (meta?.filename as string) ?? "a file";
      return (
        <>
          <span className="font-medium text-[#F7F7F8]">{actor}</span>
          {" attached "}
          <span className="font-medium text-[#F7F7F8]">{filename}</span>
        </>
      );
    }

    case "attachment_removed": {
      const filename = (meta?.filename as string) ?? "a file";
      return (
        <>
          <span className="font-medium text-[#F7F7F8]">{actor}</span>
          {" removed "}
          <span className="font-medium text-[#F7F7F8]">{filename}</span>
        </>
      );
    }

    case "task_deleted":
      return <><span className="font-medium text-[#F7F7F8]">{actor}</span> deleted this task</>;

    default:
      return <><span className="font-medium text-[#F7F7F8]">{actor}</span> made a change</>;
  }
}

function EventRow({ event }: { event: TaskEventWithActor }) {
  const Icon = EVENT_ICONS[event.type as TaskEventType] ?? FileText;
  const isDeleted = event.type === "task_deleted";

  return (
    <div className="group relative flex items-start gap-3 py-1.5">
      {/* Icon */}
      <div
        className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isDeleted
            ? "bg-[rgba(212,69,58,0.12)]"
            : "bg-[#1C1C21]"
        }`}
      >
        <Icon
          size={11}
          className={isDeleted ? "text-[#D4453A]" : "text-[#55555F]"}
        />
      </div>
      {/* Text */}
      <p className="flex-1 text-xs leading-5 text-[#9494A0]">
        <EventDescription event={event} />
      </p>
      {/* Timestamp */}
      <span className="shrink-0 text-[10px] leading-5 text-[#55555F] opacity-0 transition-opacity group-hover:opacity-100">
        {formatRelativeTime(event.createdAt)}
      </span>
    </div>
  );
}

function CommentRow({ comment }: { comment: CommentWithAuthor }) {
  return (
    <div className="relative ml-8 rounded-lg bg-[#1C1C21] p-3">
      <div className="mb-1 flex items-center gap-2">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium ${
            comment.authorRole === "owner"
              ? "bg-[rgba(212,69,58,0.12)] text-[#D4453A]"
              : "bg-[rgba(240,168,104,0.12)] text-[#F0A868]"
          }`}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-[#F7F7F8]">
          {comment.authorName}
        </span>
        <span className="text-[10px] text-[#55555F]">
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>
      <Markdown className="text-sm leading-relaxed text-[#9494A0]">{comment.body}</Markdown>
    </div>
  );
}

export function TaskActivity({ taskId, refreshKey }: { taskId: string; refreshKey?: number }) {
  const { events, loading: eventsLoading, fetchEvents } = useTaskEvents(taskId);
  const { comments, loading: commentsLoading, addComment } = useComments(taskId);
  const [newComment, setNewComment] = useState("");

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...events
        .filter((e) => e.type !== "comment_added")
        .map((e) => ({ kind: "event" as const, data: e })),
      ...comments.map((c) => ({ kind: "comment" as const, data: c })),
    ];
    return items.sort(
      (a, b) =>
        new Date(a.data.createdAt).getTime() -
        new Date(b.data.createdAt).getTime(),
    );
  }, [events, comments]);

  // Re-fetch events when parent signals a change (e.g. status/priority update)
  useEffect(() => {
    if (refreshKey) fetchEvents();
  }, [refreshKey, fetchEvents]);

  const loading = eventsLoading || commentsLoading;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(newComment.trim());
    setNewComment("");
    // Refresh events to pick up the comment_added event
    fetchEvents();
  };

  return (
    <div>
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#55555F]">
        Activity
      </h4>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="h-3 w-3 animate-spin rounded-full border border-[#55555F] border-t-transparent" />
          <span className="text-xs text-[#55555F]">Loading activity...</span>
        </div>
      ) : timeline.length === 0 ? (
        <p className="py-3 text-xs text-[#55555F]">No activity yet.</p>
      ) : (
        <div className="relative space-y-1">
          {/* Vertical connector line */}
          <div className="absolute top-3 bottom-3 left-[9px] w-px bg-white/[0.04]" />

          {timeline.map((item) =>
            item.kind === "event" ? (
              <EventRow key={`e-${item.data.id}`} event={item.data} />
            ) : (
              <CommentRow key={`c-${item.data.id}`} comment={item.data} />
            ),
          )}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-lg border border-white/[0.06] bg-[#252529] px-3 py-2 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
        />
        <button
          type="submit"
          className="rounded-lg bg-[#D4453A] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#C03830]"
        >
          Send
        </button>
      </form>
    </div>
  );
}
