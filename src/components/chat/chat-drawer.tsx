"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { ChatMessage } from "./message";
import type { UserRole } from "@/db/schema";

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: UserRole;
}

export function ChatDrawer({ open, onOpenChange, userRole }: ChatDrawerProps) {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[400px] flex-col border-l border-border bg-surface-0 p-0 sm:w-[400px]"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            AI Assistant
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {userRole === "owner" ? "Full Access" : "Read Only"}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <span className="text-lg">✦</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {userRole === "owner"
                    ? "Create tasks, get summaries, or generate reports."
                    : "Ask about task status or project progress."}
                </p>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Thinking...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 border-border bg-surface-1 focus-visible:ring-brand/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-brand text-white hover:bg-brand/90 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
