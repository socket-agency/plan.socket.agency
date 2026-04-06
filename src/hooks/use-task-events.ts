"use client";

import { useState, useEffect, useCallback } from "react";
import type { TaskEventWithActor } from "@/lib/types";

export function useTaskEvents(taskId: string) {
  const [events, setEvents] = useState<TaskEventWithActor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/events`);
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, fetchEvents };
}
