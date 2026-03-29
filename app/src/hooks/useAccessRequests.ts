import { useState, useEffect } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent } from "./useChannelEvent";
import { EVENTS } from "../lib/events";

export interface AccessRequest {
  email: string;
  timestamp: string;
}

export function useAccessRequests() {
  const { channel } = useDashboardChannel();
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  const event = useChannelEvent<{ data: { email: string; timestamp: string } }>(channel, EVENTS.tunnel.accessRequested);
  useEffect(() => {
    if (!event?.data) return;
    const { email, timestamp } = event.data;
    setRequests((prev) => {
      if (prev.some((r) => r.email === email && r.timestamp === timestamp)) return prev;
      return [...prev, { email, timestamp }];
    });
  }, [event]);

  function dismiss(email: string) {
    setRequests((prev) => prev.filter((r) => r.email !== email));
  }

  return { requests, dismiss };
}
