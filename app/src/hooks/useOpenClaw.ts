import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { OpenClawStatus, OpenClawChannel, OpenClawMessage } from "../lib/api";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEventBuffer } from "./useChannelEvent";
import { useRefetchOnDashboardEvent } from "./useRefetchOnDashboardEvent";
import { EVENTS } from "../lib/events";

export function useOpenClaw() {
  const { channel } = useDashboardChannel();
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [channels, setChannels] = useState<OpenClawChannel[]>([]);
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [historicalMessages, setHistoricalMessages] = useState<OpenClawMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());

  const { generation: g1 } = useRefetchOnDashboardEvent(EVENTS.openclaw.started);
  const { generation: g2 } = useRefetchOnDashboardEvent(EVENTS.openclaw.stopped);
  const { generation: g3 } = useRefetchOnDashboardEvent(EVENTS.openclaw.health);

  const inbound = useChannelEventBuffer<OpenClawMessage>(
    channel, EVENTS.openclaw.messageInbound, 100,
  );
  const outbound = useChannelEventBuffer<OpenClawMessage>(
    channel, EVENTS.openclaw.messageOutbound, 100,
  );

  // Live messages from PubSub events (no dedup key, use index)
  const liveMessages: OpenClawMessage[] = [
    ...inbound.map((m) => ({ ...m, direction: "inbound" as const, timestamp: Date.now() })),
    ...outbound.map((m) => ({ ...m, direction: "outbound" as const, timestamp: Date.now() })),
  ];

  // Combine historical + live, deduplicated by id where available
  const messages: OpenClawMessage[] = (() => {
    const combined = [...historicalMessages];
    for (const m of liveMessages) {
      if (m.id && seenIds.current.has(m.id)) continue;
      if (m.id) seenIds.current.add(m.id);
      combined.push(m);
    }
    return combined.slice(-200).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  })();

  const fetchMessages = useCallback(() => {
    api.openclawMessages({ limit: 200 })
      .then((r) => {
        const msgs = (r.messages ?? []).map((m) => ({
          ...m,
          timestamp: m.inserted_at ? new Date(m.inserted_at as unknown as string).getTime() : Date.now(),
        }));
        msgs.forEach((m) => { if (m.id) seenIds.current.add(m.id); });
        setHistoricalMessages(msgs);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    api.openclawStatus()
      .then((s) => { setStatus(s); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    api.openclawChannels()
      .then((r) => {
        setChannels(r.channels ?? []);
        setWelcomeMessage(r.welcome_message ?? "");
      })
      .catch(() => {});

    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh, g1, g2, g3]);

  // Refresh message history when a new live message arrives
  useEffect(() => {
    if (liveMessages.length > 0) fetchMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbound.length, outbound.length]);

  const setEnabled = useCallback((enabled: boolean) => {
    api.openclawSetEnabled(enabled).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const start = useCallback(() => {
    api.openclawStart().then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const stop = useCallback(() => {
    api.openclawStop().then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const restart = useCallback(() => {
    api.openclawRestart().then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const updateChannel = useCallback((name: string, updates: Record<string, unknown>) => {
    api.openclawUpdateChannel(name, updates).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const addChannel = useCallback((name: string) => {
    api.openclawCreateChannel(name).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const removeChannel = useCallback((name: string) => {
    api.openclawDeleteChannel(name).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  return {
    status, channels, messages, loading, error, welcomeMessage,
    setEnabled, start, stop, restart,
    updateChannel, addChannel, removeChannel, refresh,
  };
}
