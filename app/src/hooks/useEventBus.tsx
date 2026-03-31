import { createContext, useCallback, useContext, useState } from "react";

// -- Event types --------------------------------------------------------------

export type EventSeverity = "success" | "error" | "warning" | "info";

export type EventActionMeta =
  | { type: "focus-session"; sessionId: string; label: string }
  | { type: "view-proposal"; slug: string };

export interface EngineEvent {
  id: number;
  category: string;
  event: string;
  message: string;
  severity: EventSeverity;
  timestamp: number;
  data?: Record<string, unknown>;
  actionMeta?: EventActionMeta;
}

// -- Bus state ----------------------------------------------------------------

export interface EventBusState {
  events: EngineEvent[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
}

export interface EventBusApi {
  emit: (opts: Omit<EngineEvent, "id" | "timestamp">) => void;
  state: EventBusState;
}

const EventBusContext = createContext<EventBusApi | null>(null);

export const EventBusProvider = EventBusContext.Provider;

let nextEventId = 1;

export function useEventBusProvider(): EventBusApi {
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const emit = useCallback((opts: Omit<EngineEvent, "id" | "timestamp">) => {
    const entry: EngineEvent = {
      ...opts,
      id: nextEventId++,
      timestamp: Date.now(),
    };
    setEvents((prev) => [...prev, entry]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setEvents([]);
    setUnreadCount(0);
  }, []);

  return {
    emit,
    state: { events, unreadCount, markAllRead, clearAll },
  };
}

export function useEventBus(): EventBusApi {
  const ctx = useContext(EventBusContext);
  if (!ctx) throw new Error("useEventBus must be used within an EventBusProvider");
  return ctx;
}

export function useEvents(): EventBusState {
  const { state } = useEventBus();
  return state;
}
