"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Send,
  X,
  Sparkles,
  Plus,
  ChevronLeft,
  Trash2,
  MessageSquare,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  useConversations,
  type ConversationSummary,
} from "@/hooks/use-conversations";

const transport = new DefaultChatTransport({ api: "/api/chat" });

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/** Inner chat component — remounts on conversation switch via key */
function ChatInner({
  chatId,
  initialMessages,
  expanded,
  onMessagesChange,
  onStreamingChange,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  expanded?: boolean;
  onMessagesChange?: (messages: UIMessage[]) => void;
  onStreamingChange?: (streaming: boolean) => void;
}) {
  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync live messages back to parent so they survive container remounts
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Report streaming status to parent (to disable expand toggle)
  const isLoading = status === "streaming" || status === "submitted";
  useEffect(() => {
    onStreamingChange?.(isLoading);
  }, [isLoading, onStreamingChange]);

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

  return (
    <>
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
                className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  expanded ? "max-w-[75%]" : "max-w-[85%]"
                } ${
                  isUser
                    ? "bg-[#252529] text-[#F7F7F8]"
                    : "bg-[#1C1C21] text-[#9494A0]"
                }`}
              >
                {msg.parts.map((part, i) => {
                  if (part.type === "text")
                    return <Markdown key={i}>{part.text}</Markdown>;
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
                      toolPart.toolName ?? part.type.replace("tool-", "");
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
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4453A]"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4453A]"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] p-4">
        <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${expanded ? "mx-auto max-w-3xl" : ""}`}>
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
    </>
  );
}

/** Conversation list view */
function ConversationList({
  conversations,
  loading,
  onSelect,
  onDelete,
  onNewChat,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/[0.06] p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-[#252529] px-3 py-2.5 text-sm text-[#F7F7F8] transition-colors hover:bg-[#2a2a2f]"
        >
          <Plus size={14} />
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-[#55555F]">Loading...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,69,58,0.12), rgba(240,168,104,0.08))",
              }}
            >
              <MessageSquare size={20} className="text-[#D4453A]" />
            </div>
            <p className="text-sm text-[#9494A0]">
              No conversations yet. Start a new one!
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.04] cursor-pointer"
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare
                  size={14}
                  className="shrink-0 text-[#55555F]"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[#F7F7F8]">
                    {conv.title || "Untitled conversation"}
                  </p>
                  <p className="text-xs text-[#55555F]">
                    {formatRelativeTime(conv.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="shrink-0 rounded p-1 text-[#55555F] opacity-0 transition-all hover:bg-white/[0.08] hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared header content */
function ChatHeader({
  view,
  expanded,
  onBack,
  onClose,
  onToggleExpand,
  disableExpand,
}: {
  view: "list" | "chat";
  expanded: boolean;
  onBack: () => void;
  onClose: () => void;
  onToggleExpand: () => void;
  disableExpand?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(212,69,58,0.15), rgba(240,168,104,0.1))",
      }}
    >
      <div className="flex items-center gap-2.5">
        {view === "chat" && (
          <button
            onClick={onBack}
            className="rounded-md p-1.5 text-[#9494A0] transition-colors hover:bg-white/[0.08] hover:text-[#F7F7F8]"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg, #D4453A, #F0A868)",
          }}
        >
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#F7F7F8]">
            AI Assistant
          </h2>
          <p className="text-xs text-[#9494A0]">
            {view === "list"
              ? "Your conversations"
              : "Ask about tasks, status, or anything"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleExpand}
          disabled={disableExpand}
          className="rounded-md p-1.5 text-[#9494A0] transition-colors hover:bg-white/[0.08] hover:text-[#F7F7F8] disabled:opacity-30 disabled:pointer-events-none"
          title={expanded ? "Minimize" : "Expand"}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-[#9494A0] transition-colors hover:bg-white/[0.08] hover:text-[#F7F7F8]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/** Shared body content */
function ChatBody({
  view,
  expanded,
  conversations,
  loading,
  loadingMessages,
  activeId,
  activeMessages,
  onSelect,
  onDelete,
  onNewChat,
  onMessagesChange,
  onStreamingChange,
}: {
  view: "list" | "chat";
  expanded: boolean;
  conversations: ConversationSummary[];
  loading: boolean;
  loadingMessages: boolean;
  activeId: string | null;
  activeMessages: UIMessage[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onMessagesChange: (messages: UIMessage[]) => void;
  onStreamingChange: (streaming: boolean) => void;
}) {
  if (view === "list") {
    return (
      <ConversationList
        conversations={conversations}
        loading={loading}
        onSelect={onSelect}
        onDelete={onDelete}
        onNewChat={onNewChat}
      />
    );
  }

  if (loadingMessages) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[#55555F]">Loading messages...</span>
      </div>
    );
  }

  if (activeId) {
    return (
      <ChatInner
        key={activeId}
        chatId={activeId}
        initialMessages={activeMessages}
        expanded={expanded}
        onMessagesChange={onMessagesChange}
        onStreamingChange={onStreamingChange}
      />
    );
  }

  return null;
}

export function EmberAiChat({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    conversations,
    loading,
    activeId,
    activeMessages,
    loadingMessages,
    fetchConversations,
    loadMessages,
    deleteConversation,
    createNew,
  } = useConversations();

  const [view, setView] = useState<"list" | "chat">("list");
  const [expanded, setExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  // Live messages synced from ChatInner — survives container remounts
  const liveMessagesRef = useRef<UIMessage[]>([]);
  // Prevent auto-start effect from firing more than once
  const hasAutoCreatedRef = useRef(false);

  // When opening, refresh conversations
  useEffect(() => {
    if (open) {
      hasAutoCreatedRef.current = false;
      fetchConversations();
    }
  }, [open, fetchConversations]);

  // Auto-start a new chat when there are no conversations
  useEffect(() => {
    if (
      !loading &&
      conversations.length === 0 &&
      view === "list" &&
      !hasAutoCreatedRef.current
    ) {
      hasAutoCreatedRef.current = true;
      createNew();
      setView("chat");
    }
  }, [loading, conversations.length, view, createNew]);

  // Reset live messages when switching conversations
  useEffect(() => {
    liveMessagesRef.current = activeMessages;
  }, [activeId, activeMessages]);

  const handleSelectConversation = async (id: string) => {
    await loadMessages(id);
    setView("chat");
  };

  const handleNewChat = () => {
    createNew();
    liveMessagesRef.current = [];
    setView("chat");
  };

  const handleBackToList = () => {
    setView("list");
    fetchConversations();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleMessagesChange = useCallback((messages: UIMessage[]) => {
    liveMessagesRef.current = messages;
  }, []);

  const handleStreamingChange = useCallback((streaming: boolean) => {
    setIsStreaming(streaming);
  }, []);

  const headerProps = {
    view,
    expanded,
    onBack: handleBackToList,
    onClose,
    onToggleExpand: () => setExpanded((e) => !e),
    disableExpand: isStreaming,
  };

  // Use live messages (from ref) — they're always more up-to-date than
  // activeMessages from DB, which may lag behind onFinish
  const messagesForChat =
    liveMessagesRef.current.length > 0
      ? liveMessagesRef.current
      : activeMessages;

  const bodyProps = {
    view,
    expanded,
    conversations,
    loading,
    loadingMessages,
    activeId,
    activeMessages: messagesForChat,
    onSelect: handleSelectConversation,
    onDelete: handleDelete,
    onNewChat: handleNewChat,
    onMessagesChange: handleMessagesChange,
    onStreamingChange: handleStreamingChange,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay
          className={expanded ? undefined : "bg-transparent backdrop-blur-none"}
        />
        <DialogPrimitive.Popup
          aria-label="AI Assistant"
          className={`fixed z-50 flex flex-col overflow-hidden bg-[#131316] shadow-2xl outline-none transition-all duration-300 ease-in-out ${
            expanded
              ? "inset-4 rounded-2xl border border-white/[0.06] sm:inset-8 md:inset-12"
              : "inset-y-0 right-0 w-[380px] border-l border-white/[0.06]"
          } data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`}
        >
          <ChatHeader {...headerProps} />
          <ChatBody {...bodyProps} />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
