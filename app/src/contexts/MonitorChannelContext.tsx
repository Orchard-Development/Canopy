import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Channel } from "phoenix";
import { getSocket } from "@/lib/phoenix-socket";

export interface MonitorChannelValue {
  channel: Channel | null;
  connected: boolean;
}

export const MonitorChannelContext = createContext<MonitorChannelValue>({
  channel: null,
  connected: false,
});

/**
 * Single shared monitor channel instance for the entire app.
 *
 * Mirrors DashboardChannelProvider: one Phoenix channel join on the
 * server, shared by all consumers (useMonitorChannel, useActivityFeed).
 */
export function MonitorChannelProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<Channel | null>(null);
  // Force re-render when channel changes so consumers get the new ref
  const [, setVersion] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    const ch = socket.channel("monitor", {});
    channelRef.current = ch;
    setVersion((v) => v + 1);

    ch.join()
      .receive("ok", () => setConnected(true))
      .receive("error", (reason) => {
        console.warn("[MonitorChannel] failed to join:", reason);
        setConnected(false);
      });

    ch.onClose(() => setConnected(false));
    ch.onError(() => setConnected(false));

    return () => {
      ch.leave();
      channelRef.current = null;
      setConnected(false);
    };
  }, []);

  return (
    <MonitorChannelContext.Provider value={{ channel: channelRef.current, connected }}>
      {children}
    </MonitorChannelContext.Provider>
  );
}
