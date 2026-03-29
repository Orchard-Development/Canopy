import { useState, useEffect, useCallback } from "react";
import { useChannelEvent } from "./useChannelEvent";
import { useDashboardChannel } from "./useDashboardChannel";
import { EVENTS } from "../lib/events";
import { api, type TunnelConnection } from "@/lib/api";

export function useTunnelConnections() {
  const { channel } = useDashboardChannel();
  const [connections, setConnections] = useState<TunnelConnection[]>([]);

  // Poll for pending connections only when tunnels are enabled
  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    // Check if tunnels are enabled before polling
    fetch("/api/tunnel/status")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data.enabled) return;
        function poll() {
          api.listTunnelConnections()
            .then(({ connections: list }) => {
              if (active) setConnections(list);
            })
            .catch(() => {});
        }
        poll();
        intervalId = setInterval(poll, 3000);
      })
      .catch(() => {});

    return () => { active = false; if (intervalId) clearInterval(intervalId); };
  }, []);

  // New connection requests from remote users
  const createdEvent = useChannelEvent<TunnelConnection>(channel, EVENTS.tunnel.connectionCreated);
  useEffect(() => {
    if (!createdEvent) return;
    setConnections((prev) => {
      if (prev.some((c) => c.id === createdEvent.id)) return prev;
      return [...prev, createdEvent];
    });
  }, [createdEvent]);

  // Connection resolved (approved or denied)
  const resolvedEvent = useChannelEvent<{ id: string }>(channel, EVENTS.tunnel.connectionResolved);
  useEffect(() => {
    if (!resolvedEvent) return;
    setConnections((prev) => prev.filter((c) => c.id !== resolvedEvent.id));
  }, [resolvedEvent]);

  const approve = useCallback((id: string) => {
    api.approveTunnelConnection(id).catch(() => {});
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const deny = useCallback((id: string) => {
    api.denyTunnelConnection(id).catch(() => {});
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { connections, approve, deny };
}
