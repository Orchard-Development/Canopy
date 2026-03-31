import { createContext, useCallback, useContext, useRef, useState } from "react";

// -- Event types --------------------------------------------------------------

export type EventSeverity = "success" | "error" | "warning" | "info";

export type EventTier = "critical" | "noteworthy";

export type EventActionMeta =
  | { type: "focus-session"; sessionId: string; label: string }
  | { type: "view-proposal"; slug: string };

export interface EngineEvent {
  id: number;
  category: string;
  event: string;
  message: string;
  severity: EventSeverity;
  tier: EventTier;
  timestamp: number;
  dedupCount?: number;
  data?: Record<string, unknown>;
  actionMeta?: EventActionMeta;
}

// -- Bus state ----------------------------------------------------------------

export interface EventBusState {
  events: EngineEvent[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
  dismissEvent: (id: number) => void;
  clearNoteworthy: () => void;
}

type EmitInput = Omit<EngineEvent, "id" | "timestamp" | "tier" | "dedupCount">;

export interface EventBusApi {
  emit: (opts: EmitInput) => void;
  state: EventBusState;
}

const EventBusContext = createContext<EventBusApi | null>(null);

export const EventBusProvider = EventBusContext.Provider;

let nextEventId = 1;

function tierFor(severity: EventSeverity): EventTier {
  if (severity === "error" || severity === "warning") return "critical";
  return "noteworthy";
}

const MAX_EVENTS = 200;
const DEDUP_WINDOW_MS = 10_000;

export function useEventBusProvider(): EventBusApi {
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dedupMapRef = useRef<Map<string, { id: number; timestamp: number }>>(new Map());

  const emit = useCallback((opts: EmitInput) => {
    const tier = tierFor(opts.severity);
    const now = Date.now();

    // Prune stale dedup entries to prevent unbounded map growth
    for (const [key, val] of dedupMapRef.current) {
      if (now - val.timestamp > DEDUP_WINDOW_MS) dedupMapRef.current.delete(key);
    }

    // Dedup: errors and events with actions bypass dedup
    if (opts.severity !== "error" && !opts.actionMeta) {
      const dedupKey = `${opts.category}:${opts.event}`;
      const existing = dedupMapRef.current.get(dedupKey);
      if (existing && now - existing.timestamp < DEDUP_WINDOW_MS) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === existing.id
              ? { ...e, dedupCount: (e.dedupCount ?? 1) + 1, timestamp: now }
              : e,
          ),
        );
        existing.timestamp = now;
        return;
      }
      dedupMapRef.current.set(dedupKey, { id: nextEventId, timestamp: now });
    }

    const entry: EngineEvent = {
      ...opts,
      id: nextEventId++,
      timestamp: now,
      tier,
    };

    setEvents((prev) => {
      const next = [...prev, entry];
      if (next.length <= MAX_EVENTS) return next;
      const nonCritIdx = next.findIndex((e) => e.tier !== "critical");
      if (nonCritIdx !== -1) {
        next.splice(nonCritIdx, 1);
        return next;
      }
      return next.slice(1);
    });
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const clearAll = useCallback(() => {
    setEvents([]);
    setUnreadCount(0);
    dedupMapRef.current.clear();
  }, []);

  const dismissEvent = useCallback((id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearNoteworthy = useCallback(() => {
    setEvents((prev) => prev.filter((e) => e.tier === "critical"));
    dedupMapRef.current.clear();
  }, []);

  return {
    emit,
    state: { events, unreadCount, markAllRead, clearAll, dismissEvent, clearNoteworthy },
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
