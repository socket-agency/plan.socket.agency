"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommentWithAuthor } from "@/lib/types";

export function useComments(taskId: string) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (body: string) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      return created as CommentWithAuthor;
    },
    [taskId]
  );

  return { comments, loading, fetchComments, addComment };
}
