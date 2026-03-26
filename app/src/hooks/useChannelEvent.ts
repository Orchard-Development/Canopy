import { useEffect, useState, useRef } from "react";
import type { Channel } from "phoenix";

/**
 * Listen for a specific pushed event on a Phoenix channel.
 *
 * Returns the latest payload received for that event, or null if
 * nothing has arrived yet. Cleans up the listener on unmount or
 * when the channel / event name changes.
 */
export function useChannelEvent<T = unknown>(
  channel: Channel | null,
  event: string,
): T | null {
  const [payload, setPayload] = useState<T | null>(null);
  const eventRef = useRef(event);
  eventRef.current = event;

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(event, (data: T) => {
      setPayload(data);
    });

    return () => {
      channel.off(event, ref);
      setPayload(null);
    };
  }, [channel, event]);

  return payload;
}

/**
 * Listen for a specific pushed event and collect payloads into a buffer.
 *
 * Useful for streaming data like terminal output where you need the
 * full history, not just the latest message.
 */
export function useChannelEventBuffer<T = unknown>(
  channel: Channel | null,
  event: string,
  maxSize = 500,
): T[] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(event, (data: T) => {
      setItems((prev) => {
        const next = [...prev, data];
        return next.length > maxSize ? next.slice(-maxSize) : next;
      });
    });

    return () => {
      channel.off(event, ref);
      setItems([]);
    };
  }, [channel, event, maxSize]);

  return items;
}
