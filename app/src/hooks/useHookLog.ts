import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { EVENTS } from "../lib/events";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent } from "./useChannelEvent";

export interface HookEntry {
  id: number;
  event_type: string; // session_start | prompt | tool | assistant_text | thinking | stop | notification
  source_uuid?: string;
  tool_name?: string;
  content?: string;
  metadata?: string;
  created_at: string;
}

interface UseHookLogResult {
  entries: HookEntry[];
  loading: boolean;
}

/**
 * Fetches hook log entries for a session and re-fetches when relevant
 * channel events arrive (agent:tool, agent:prompt, agent:lifecycle).
 *
 * Pass a changing `refreshKey` to trigger manual re-fetches.
 */
export function useHookLog(
  sessionId: string | null,
  refreshKey: number = 0,
): UseHookLogResult {
  const [entries, setEntries] = useState<HookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { channel } = useDashboardChannel();

  const toolEvent = useChannelEvent<{ session_id?: string }>(
    channel,
    EVENTS.agent.tool,
  );
  const promptEvent = useChannelEvent<{ session_id?: string }>(
    channel,
    EVENTS.agent.prompt,
  );
  const lifecycleEvent = useChannelEvent<{ session_id?: string }>(
    channel,
    EVENTS.agent.lifecycle,
  );

  const fetchEntries = useCallback((id: string) => {
    setLoading(true);
    api
      .getTerminalHookLog(id)
      .then((res) => {
        setEntries(res.entries);
      })
      .catch(() => {
        // Keep existing entries on re-fetch failure — do nothing
      })
      .finally(() => setLoading(false));
  }, []);

  // Initial fetch and refreshKey-driven fetch
  useEffect(() => {
    if (!sessionId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    fetchEntries(sessionId);
  }, [sessionId, refreshKey, fetchEntries]);

  // Debounced re-fetch on channel events
  const debouncedRefetch = useCallback(
    (sid: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchEntries(sid);
      }, 300);
    },
    [fetchEntries],
  );

  // React to any agent channel event (tool, prompt, lifecycle)
  useEffect(() => {
    if (!sessionId) return;
    const fired = [toolEvent, promptEvent, lifecycleEvent].some(
      (e) => e?.session_id === sessionId,
    );
    if (fired) {
      debouncedRefetch(sessionId);
    }
  }, [toolEvent, promptEvent, lifecycleEvent, sessionId, debouncedRefetch]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { entries, loading };
}
