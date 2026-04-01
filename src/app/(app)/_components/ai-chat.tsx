"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, X, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function EmberAiChat({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming" || status === "submitted")
      return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-[380px] flex-col border-l border-white/[0.06] bg-[#131316] p-0 sm:max-w-[380px]"
      >
        {/* Gradient header */}
        <SheetHeader className="p-0">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,69,58,0.15), rgba(240,168,104,0.1))",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #D4453A, #F0A868)",
                }}
              >
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold text-[#F7F7F8]">
                  AI Assistant
                </SheetTitle>
                <SheetDescription className="text-xs text-[#9494A0]">
                  Ask about tasks, status, or anything
                </SheetDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-[#9494A0] transition-colors hover:bg-white/[0.08] hover:text-[#F7F7F8]"
            >
              <X size={16} />
            </button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(212,69,58,0.12), rgba(240,168,104,0.08))",
                }}
              >
                <Sparkles size={20} className="text-[#D4453A]" />
              </div>
              <p className="text-sm text-[#9494A0]">
                Ask me about your tasks, deadlines, or project status.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "bg-[#252529] text-[#F7F7F8]"
                      : "bg-[#1C1C21] text-[#9494A0]"
                  }`}
                >
                  {msg.parts.map((part, i) => {
                    if (part.type === "text")
                      return (
                        <span key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      );
                    if (
                      part.type.startsWith("tool-") ||
                      part.type === "dynamic-tool"
                    ) {
                      const toolPart = part as {
                        toolName?: string;
                        state?: string;
                        type: string;
                      };
                      const name =
                        toolPart.toolName ??
                        part.type.replace("tool-", "");
                      const state = toolPart.state;
                      return (
                        <span
                          key={i}
                          className="mt-1 block rounded bg-[#252529] px-2 py-1 font-mono text-xs text-[#55555F]"
                        >
                          {state === "output-available"
                            ? `Done: ${name}`
                            : `Running: ${name}...`}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-xl bg-[#1C1C21] px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4453A]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4453A] delay-150" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4453A] delay-300" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.06] p-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 rounded-lg border border-white/[0.06] bg-[#252529] px-3 py-2.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30"
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, #D4453A, #F0A868)"
                  : "#252529",
              }}
            >
              <Send size={16} className="text-white" />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
