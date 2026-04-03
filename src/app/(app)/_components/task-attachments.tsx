"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Paperclip, X, Download, ChevronUp, FileIcon } from "lucide-react";
import { useAttachments } from "@/hooks/use-attachments";
import { useAuth } from "@/hooks/use-auth";
import type { Attachment } from "@/lib/types";

function isImage(contentType: string) {
  return contentType.startsWith("image/");
}

function fileUrl(taskId: string, attachmentId: string) {
  return `/api/tasks/${taskId}/attachments/${attachmentId}/file`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentThumbnail({
  attachment,
  taskId,
  canDelete,
  onDelete,
  onClick,
}: {
  attachment: Attachment;
  taskId: string;
  canDelete: boolean;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="flex h-[60px] w-[80px] items-center justify-center overflow-hidden rounded-md border border-white/[0.06] bg-[#1C1C21] transition-colors hover:border-white/[0.12]"
      >
        {isImage(attachment.contentType) ? (
          <img
            src={fileUrl(taskId, attachment.id)}
            alt={attachment.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <FileIcon size={16} className="text-[#55555F]" />
            <span className="max-w-[68px] truncate px-1 text-[9px] text-[#55555F]">
              {attachment.filename}
            </span>
          </div>
        )}
      </button>
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#252529] text-[#55555F] opacity-0 transition-opacity hover:bg-[#D4453A] hover:text-white group-hover:opacity-100"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

function UploadingThumbnail({ progress }: { progress: number }) {
  return (
    <div className="flex h-[60px] w-[80px] items-center justify-center rounded-md border border-white/[0.06] bg-[#1C1C21]">
      <div className="flex flex-col items-center gap-1">
        <div className="h-1 w-10 overflow-hidden rounded-full bg-[#252529]">
          <div
            className="h-full rounded-full bg-[#D4453A] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[9px] text-[#55555F]">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function ExpandedPreview({
  attachment,
  taskId,
  onCollapse,
}: {
  attachment: Attachment;
  taskId: string;
  onCollapse: () => void;
}) {
  const url = fileUrl(taskId, attachment.id);
  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-white/[0.06] bg-[#1C1C21]">
      <button onClick={onCollapse} className="w-full">
        <img
          src={url}
          alt={attachment.filename}
          className="max-h-[400px] w-full object-contain"
        />
      </button>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-[#9494A0]">
          {attachment.filename} · {formatFileSize(attachment.size)}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download={attachment.filename}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-[#D4453A] hover:text-[#C03830]"
          >
            <Download size={10} />
            Download
          </a>
          <button
            onClick={onCollapse}
            className="flex items-center gap-1 text-[10px] text-[#55555F] hover:text-[#9494A0]"
          >
            <ChevronUp size={10} />
            Collapse
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const { attachments, uploadAttachment, deleteAttachment } =
    useAttachments(taskId);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Map<string, number>>(new Map());
  const firstImageId = attachments.find((a) => isImage(a.contentType))?.id ?? null;
  // "none" means user explicitly collapsed — don't auto-expand
  const [expandedId, setExpandedId] = useState<string | "none" | null>(null);
  const effectiveExpandedId = expandedId === "none" ? null : (expandedId ?? firstImageId);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const tempId = crypto.randomUUID();
        setUploading((prev) => new Map(prev).set(tempId, 0));
        try {
          await uploadAttachment(file, (progress) => {
            setUploading((prev) => new Map(prev).set(tempId, progress));
          });
        } finally {
          setUploading((prev) => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });
        }
      }
    },
    [uploadAttachment]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      handleFiles(files);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleClick = (attachment: Attachment) => {
    if (isImage(attachment.contentType)) {
      setExpandedId(effectiveExpandedId === attachment.id ? "none" : attachment.id);
    } else {
      window.open(fileUrl(taskId, attachment.id), "_blank");
    }
  };

  const canDelete = (attachment: Attachment) =>
    user?.role === "owner" || attachment.uploadedBy === user?.id;

  const expandedAttachment = attachments.find((a) => a.id === effectiveExpandedId);

  return (
    <div
      className="mb-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#55555F]">
        <Paperclip size={12} />
        Attachments ({attachments.length})
      </h4>

      {expandedAttachment && (
        <ExpandedPreview
          attachment={expandedAttachment}
          taskId={taskId}
          onCollapse={() => setExpandedId("none")}
        />
      )}

      <div
        className={`flex flex-wrap gap-2 rounded-lg p-2 transition-colors ${
          isDragOver
            ? "border border-dashed border-[#D4453A]/50 bg-[rgba(212,69,58,0.04)]"
            : attachments.length === 0 && uploading.size === 0
              ? ""
              : "border border-transparent"
        }`}
      >
        {attachments.map((attachment) => (
          <AttachmentThumbnail
            key={attachment.id}
            attachment={attachment}
            taskId={taskId}
            canDelete={canDelete(attachment)}
            onDelete={() => deleteAttachment(attachment.id)}
            onClick={() => handleClick(attachment)}
          />
        ))}

        {Array.from(uploading.entries()).map(([tempId, progress]) => (
          <UploadingThumbnail key={tempId} progress={progress} />
        ))}

        {/* Add file tile */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-[60px] w-[80px] flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-white/[0.12] text-[#55555F] transition-colors hover:border-white/[0.24] hover:text-[#9494A0]"
        >
          <span className="text-lg">+</span>
          <span className="text-[9px]">Add file</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}
