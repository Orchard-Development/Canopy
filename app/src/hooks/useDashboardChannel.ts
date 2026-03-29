import { useContext } from "react";
import { DashboardChannelContext } from "@/contexts/DashboardChannelContext";
import type { DashboardChannelValue } from "@/contexts/DashboardChannelContext";

/**
 * Returns the shared dashboard channel. Must be used within
 * <DashboardChannelProvider>.
 *
 * Drop-in replacement for useChannel("dashboard") — same shape,
 * but all consumers share one Phoenix channel join.
 */
export function useDashboardChannel(): DashboardChannelValue {
  return useContext(DashboardChannelContext);
}
