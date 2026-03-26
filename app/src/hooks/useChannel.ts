import { useEffect, useRef, useState } from "react";
import type { Channel } from "phoenix";
import { getSocket } from "@/lib/phoenix-socket";

interface UseChannelResult<T = unknown> {
  /** Join response payload, null until the channel joins successfully. */
  data: T | null;
  /** The Phoenix Channel instance. null before join or after leave. */
  channel: Channel | null;
  /** True once the channel has joined successfully. */
  connected: boolean;
}

/**
 * Generic hook to join a Phoenix channel by topic.
 *
 * Joins on mount, leaves on unmount or when the topic changes.
 * Returns the join payload, the channel reference, and connection state.
 */
export function useChannel<T = unknown>(
  topic: string | null,
  params?: Record<string, unknown>,
): UseChannelResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<Channel | null>(null);
  const paramsKey = params ? JSON.stringify(params) : "";

  useEffect(() => {
    if (!topic) return;

    const socket = getSocket();
    const ch = socket.channel(topic, params ?? {});
    channelRef.current = ch;

    ch.join()
      .receive("ok", (response: T) => {
        setData(response);
        setConnected(true);
      })
      .receive("error", (reason) => {
        console.warn(`[useChannel] failed to join "${topic}":`, reason);
        setConnected(false);
      });

    ch.onClose(() => {
      setConnected(false);
    });

    ch.onError(() => {
      setConnected(false);
    });

    return () => {
      ch.leave();
      channelRef.current = null;
      setData(null);
      setConnected(false);
    };
  }, [topic, paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, channel: channelRef.current, connected };
}
