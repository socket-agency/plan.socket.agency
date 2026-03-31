"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1", isUser && "items-end")}>
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {isUser ? "You" : "AI"}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-brand text-white"
            : "bg-surface-2 text-foreground"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className="whitespace-pre-wrap">
                {part.text}
              </div>
            );
          }
          if (part.type.startsWith("tool-")) {
            const toolPart = part as { type: string; toolName?: string; state?: string; toolCallId?: string };
            return (
              <div
                key={i}
                className="my-1 rounded border border-border bg-surface-0 px-2 py-1 font-mono text-[10px] text-muted-foreground"
              >
                <span>{toolPart.toolName || "tool"}</span>
                {toolPart.state === "result" && (
                  <span className="ml-1.5 text-emerald-400">done</span>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
