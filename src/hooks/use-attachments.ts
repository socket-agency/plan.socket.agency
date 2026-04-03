"use client";

import { useState, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import type { Attachment } from "@/lib/types";

export function useAttachments(taskId: string) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      if (!res.ok) return;
      const data = await res.json();
      setAttachments(data);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadAttachment = useCallback(
    async (
      file: File,
      onProgress?: (percentage: number) => void
    ): Promise<Attachment> => {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: `/api/tasks/${taskId}/attachments`,
        onUploadProgress: ({ percentage }) => onProgress?.(percentage),
      });

      // Register the attachment in the DB
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          pathname: blob.pathname,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!res.ok) throw new Error("Failed to register attachment");
      const attachment = await res.json();
      setAttachments((prev) => [...prev, attachment]);
      return attachment as Attachment;
    },
    [taskId]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      const res = await fetch(
        `/api/tasks/${taskId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete attachment");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    },
    [taskId]
  );

  return {
    attachments,
    loading,
    fetchAttachments,
    uploadAttachment,
    deleteAttachment,
  };
}
