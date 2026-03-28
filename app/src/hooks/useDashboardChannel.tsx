import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Channel } from "phoenix";
import { useChannel } from "./useChannel";

interface DashboardChannelState {
  channel: Channel | null;
  connected: boolean;
  data: unknown;
}

const DashboardChannelContext = createContext<DashboardChannelState>({
  channel: null,
  connected: false,
  data: null,
});

/**
 * Single shared dashboard channel instance for the entire app.
 *
 * Wrap the app tree with this provider so every consumer shares one
 * Phoenix channel process on the server instead of each component
 * creating its own (which causes event gaps during unmount/remount).
 */
export function DashboardChannelProvider({ children }: { children: ReactNode }) {
  const { channel, connected, data } = useChannel("dashboard");
  const value = useMemo(() => ({ channel, connected, data }), [channel, connected, data]);
  return (
    <DashboardChannelContext.Provider value={value}>
      {children}
    </DashboardChannelContext.Provider>
  );
}

/**
 * Access the shared dashboard channel. Must be used inside DashboardChannelProvider.
 *
 * Drop-in replacement for `useChannel("dashboard")` -- returns the same shape.
 */
export function useDashboardChannel(): DashboardChannelState {
  return useContext(DashboardChannelContext);
}
