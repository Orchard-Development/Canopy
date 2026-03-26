import { useChannel } from "./useChannel";
import { usePhoenixRefetch } from "./usePhoenixRefetch";

/**
 * Convenience wrapper: bump a generation counter whenever a dashboard
 * channel event fires.
 *
 * Usage:
 *   const { generation } = useRefetchOnDashboardEvent("session:state");
 */
export function useRefetchOnDashboardEvent(
  event: string,
): { generation: number; bump: () => void } {
  const { channel } = useChannel("dashboard");
  return usePhoenixRefetch(channel, event);
}
