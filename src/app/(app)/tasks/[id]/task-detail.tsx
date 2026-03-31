"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Comments } from "@/components/comments";
import {
  taskStatuses,
  taskPriorities,
  taskAssignees,
  type Task,
} from "@/db/schema";

interface TaskDetailProps {
  task: Task;
  isOwner: boolean;
}

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export function TaskDetail({ task, isOwner }: TaskDetailProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(formData: FormData) {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || null,
          status: formData.get("status"),
          priority: formData.get("priority"),
          assignee: formData.get("assignee"),
          dueDate: formData.get("dueDate") || null,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.push("/board");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Button
        variant="ghost"
        className="mb-4 gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {isOwner ? (
        <form action={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={task.title}
              className="text-lg font-semibold"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={task.description || ""}
              placeholder="Markdown supported..."
              rows={8}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={task.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue={task.priority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskPriorities.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select name="assignee" defaultValue={task.assignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskAssignees.map((a) => (
                    <SelectItem key={a} value={a} className="capitalize">
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={task.dueDate || ""}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">{task.title}</h1>

          {task.description && (
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {task.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Status</p>
              <Badge variant="secondary">
                {statusLabels[task.status] || task.status}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Priority</p>
              <Badge variant="secondary" className="capitalize">
                {task.priority}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Assignee</p>
              <Badge variant="secondary" className="capitalize">
                {task.assignee}
              </Badge>
            </div>
            {task.dueDate && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Due Date</p>
                <Badge variant="secondary">
                  {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Created{" "}
            {new Date(task.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <Comments taskId={task.id} />
      </div>
    </div>
  );
}
