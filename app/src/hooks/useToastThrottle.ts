import { useRef, useEffect, useState } from "react";
import type { EngineEvent } from "./useEventBus";
import type { ToastEntry, ToastSeverity } from "./useToast";

let nextThrottleId = 1000000; // offset from manual toast ids

const BATCH_WINDOW_MS = 2000;
const THROTTLE_WINDOW_MS = 5000;
const MAX_TOASTS_PER_WINDOW = 3;
const BATCH_THRESHOLD = 3;

function highestSeverity(events: EngineEvent[]): ToastSeverity {
  if (events.some((e) => e.severity === "error")) return "error";
  if (events.some((e) => e.severity === "warning")) return "warning";
  if (events.some((e) => e.severity === "success")) return "success";
  return "info";
}

function batchMessage(category: string, count: number): string {
  if (category === "tool") return `Agent used ${count} tools`;
  if (category === "context") return `${count} context events`;
  return `${count} ${category} events`;
}

function toastDurationForSeverity(severity: ToastSeverity): number {
  if (severity === "error") return 6000;
  return 3000;
}

/**
 * Throttles and batches filtered EngineEvents into ToastEntry[].
 *
 * - Errors and proposals always bypass batching/throttling (emitted immediately).
 * - Other events are batched in 2s windows per category. 3+ events → summary toast.
 * - Max 3 toasts in any 5s sliding window; excess is dropped silently.
 */
export function useToastThrottle(
  filteredEvents: EngineEvent[],
): ToastEntry[] {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  // Track which event ids have been processed
  const processedRef = useRef<Set<number>>(new Set());
  // Batch buffer: category -> pending events
  const batchBufferRef = useRef<Map<string, EngineEvent[]>>(new Map());
  // Flush timer handle per category
  const flushTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Sliding window: timestamps of recently emitted toasts
  const emitTimestampsRef = useRef<number[]>([]);

  function canEmit(): boolean {
    const now = Date.now();
    emitTimestampsRef.current = emitTimestampsRef.current.filter(
      (t) => now - t < THROTTLE_WINDOW_MS,
    );
    return emitTimestampsRef.current.length < MAX_TOASTS_PER_WINDOW;
  }

  function emitToast(entry: ToastEntry) {
    emitTimestampsRef.current.push(Date.now());
    setEntries((prev) => [...prev, entry]);
  }

  function flushCategory(category: string) {
    const buffer = batchBufferRef.current.get(category) ?? [];
    batchBufferRef.current.delete(category);
    flushTimersRef.current.delete(category);

    if (buffer.length === 0) return;

    if (!canEmit()) return; // drop — exceeds throttle window

    let entry: ToastEntry;
    if (buffer.length >= BATCH_THRESHOLD) {
      const severity = highestSeverity(buffer);
      entry = {
        id: nextThrottleId++,
        message: batchMessage(category, buffer.length),
        severity,
        duration: toastDurationForSeverity(severity),
      };
    } else {
      // Emit each individually (up to throttle limit)
      for (const event of buffer) {
        if (!canEmit()) break;
        emitToast({
          id: nextThrottleId++,
          message: event.message,
          severity: event.severity,
          duration: toastDurationForSeverity(event.severity),
        });
      }
      return;
    }

    emitToast(entry);
  }

  useEffect(() => {
    const newEvents = filteredEvents.filter(
      (e) => !processedRef.current.has(e.id),
    );
    if (newEvents.length === 0) return;

    for (const event of newEvents) {
      processedRef.current.add(event.id);

      // Bypass: errors and proposals always emit immediately
      const isBypass =
        event.severity === "error" || event.category === "proposal";

      if (isBypass) {
        emitToast({
          id: nextThrottleId++,
          message: event.message,
          severity: event.severity,
          duration: event.severity === "error" ? 6000 : 0,
        });
        continue;
      }

      // Add to batch buffer for this category
      const existing = batchBufferRef.current.get(event.category) ?? [];
      existing.push(event);
      batchBufferRef.current.set(event.category, existing);

      // Reset flush timer for this category
      const existingTimer = flushTimersRef.current.get(event.category);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        flushCategory(event.category);
      }, BATCH_WINDOW_MS);

      flushTimersRef.current.set(event.category, timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of flushTimersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return entries;
}
