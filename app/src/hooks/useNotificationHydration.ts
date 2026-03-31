import { useEffect, useRef } from "react";
import { useEventBus, type EngineEvent } from "./useEventBus";

interface EventsResponse {
  events: EngineEvent[];
}

async function fetchRecentEvents(): Promise<EngineEvent[]> {
  try {
    // Placeholder URL -- Ean will define the final endpoint during team sync.
    const res = await fetch("/api/events/recent?limit=200");
    if (!res.ok) return [];
    const data: EventsResponse = await res.json();
    return data.events;
  } catch {
    return [];
  }
}

/**
 * On mount, attempts to hydrate the EventBus with recent events from the engine.
 * Currently returns [] since the endpoint doesn't exist yet.
 * When Ean implements engine-side event persistence, this will "just work".
 */
export function useNotificationHydration(): void {
  const { emit } = useEventBus();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    fetchRecentEvents().then((events) => {
      for (const event of events) {
        emit({
          category: event.category,
          event: event.event,
          message: event.message,
          severity: event.severity,
          data: event.data,
          actionMeta: event.actionMeta,
        });
      }
    });
  }, [emit]);
}
