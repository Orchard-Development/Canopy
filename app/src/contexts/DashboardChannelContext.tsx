import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Channel } from "phoenix";
import { getSocket } from "@/lib/phoenix-socket";

export interface DashboardChannelValue {
  /** The shared Phoenix Channel instance. null before first successful join. */
  channel: Channel | null;
  /** Join response payload, null until joined. */
  data: unknown;
  /** True once the channel has joined successfully. */
  connected: boolean;
}

export const DashboardChannelContext = createContext<DashboardChannelValue>({
  channel: null,
  data: null,
  connected: false,
});

export function DashboardChannelProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const ch = socket.channel("dashboard", {});
    channelRef.current = ch;

    ch.join()
      .receive("ok", (response) => {
        setData(response);
        setConnected(true);
      })
      .receive("error", (reason) => {
        console.warn("[DashboardChannel] failed to join:", reason);
        setConnected(false);
      });

    ch.onClose(() => setConnected(false));
    ch.onError(() => setConnected(false));

    return () => {
      ch.leave();
      channelRef.current = null;
      setData(null);
      setConnected(false);
    };
  }, []);

  return (
    <DashboardChannelContext.Provider
      value={{ channel: channelRef.current, data, connected }}
    >
      {children}
    </DashboardChannelContext.Provider>
  );
}
