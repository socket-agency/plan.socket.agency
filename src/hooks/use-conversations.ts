"use client";

import { useState, useEffect, useCallback } from "react";
import type { UIMessage } from "ai";

export type ConversationSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<UIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages`,
      );
      if (!res.ok) throw new Error("Failed to load messages");
      const data: UIMessage[] = await res.json();
      setActiveId(conversationId);
      setActiveMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
      setConversations((prev) =>
        prev.filter((c) => c.id !== conversationId),
      );
      if (activeId === conversationId) {
        setActiveId(null);
        setActiveMessages([]);
      }
    },
    [activeId],
  );

  const createNew = useCallback(() => {
    const newId = crypto.randomUUID();
    setActiveId(newId);
    setActiveMessages([]);
    return newId;
  }, []);

  return {
    conversations,
    loading,
    activeId,
    activeMessages,
    loadingMessages,
    fetchConversations,
    loadMessages,
    deleteConversation,
    createNew,
    setActiveId,
  };
}
