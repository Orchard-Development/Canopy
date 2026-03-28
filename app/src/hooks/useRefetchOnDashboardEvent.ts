import { useDashboardChannel } from "./useDashboardChannel";
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
  const { channel } = useDashboardChannel();
  return usePhoenixRefetch(channel, event);
}
