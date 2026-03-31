"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole: string;
}

interface CommentsProps {
  taskId: string;
}

export function Comments({ taskId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        fetchComments();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Comments ({comments.length})
      </h3>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border bg-surface-1 p-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-sm font-medium">{comment.authorName}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider",
                    comment.authorRole === "owner"
                      ? "bg-surface-3 text-foreground"
                      : "bg-brand/10 text-brand"
                  )}
                >
                  {comment.authorRole}
                </Badge>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 resize-none border-border bg-surface-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !body.trim()}
          className="h-auto bg-brand text-white hover:bg-brand/90 disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
