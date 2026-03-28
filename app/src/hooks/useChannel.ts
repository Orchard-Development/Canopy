import { useCallback, useEffect, useRef, useState } from "react";
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
 * Auto-rejoins when the server closes the channel (e.g. code reload).
 * Returns the join payload, the channel reference, and connection state.
 */
export function useChannel<T = unknown>(
  topic: string | null,
  params?: Record<string, unknown>,
): UseChannelResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  // Channel stored in state (not just ref) so consumers re-render when it changes.
  const [channel, setChannel] = useState<Channel | null>(null);
  const paramsKey = params ? JSON.stringify(params) : "";

  // Track whether the effect is still active to avoid state updates after cleanup.
  const activeRef = useRef(false);
  // Track the current channel for cleanup.
  const channelRef = useRef<Channel | null>(null);
  // Rejoin timer for server-initiated close.
  const rejoinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether WE initiated the leave (cleanup) vs server-initiated close.
  const leavingRef = useRef(false);

  const joinChannel = useCallback(() => {
    if (!topic || !activeRef.current) return;

    const socket = getSocket();
    const ch = socket.channel(topic, params ?? {});
    channelRef.current = ch;

    ch.join()
      .receive("ok", (response: T) => {
        if (!activeRef.current) return;
        setData(response);
        setConnected(true);
        setChannel(ch);
      })
      .receive("error", (reason) => {
        if (!activeRef.current) return;
        console.warn(`[useChannel] failed to join "${topic}":`, reason);
        setConnected(false);
        // Retry join after backoff
        rejoinTimerRef.current = setTimeout(() => {
          if (activeRef.current) joinChannel();
        }, 2000);
      });

    ch.onClose(() => {
      if (!activeRef.current) return;
      setConnected(false);
      // Server-initiated close (code reload, crash, etc.) -- recreate channel.
      // Skip if WE called ch.leave() during cleanup.
      if (!leavingRef.current) {
        setChannel(null);
        rejoinTimerRef.current = setTimeout(() => {
          if (activeRef.current) joinChannel();
        }, 1000);
      }
    });

    ch.onError(() => {
      if (!activeRef.current) return;
      setConnected(false);
      // Phoenix JS auto-rejoins on error, but if it doesn't recover
      // within 5s we recreate the channel from scratch.
      rejoinTimerRef.current = setTimeout(() => {
        if (!activeRef.current) return;
        // If still disconnected after 5s, force recreate
        if (channelRef.current === ch) {
          ch.leave();
          joinChannel();
        }
      }, 5000);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, paramsKey]);

  useEffect(() => {
    if (!topic) return;

    activeRef.current = true;
    leavingRef.current = false;
    joinChannel();

    return () => {
      activeRef.current = false;
      leavingRef.current = true;
      if (rejoinTimerRef.current) {
        clearTimeout(rejoinTimerRef.current);
        rejoinTimerRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.leave();
        channelRef.current = null;
      }
      setChannel(null);
      setData(null);
      setConnected(false);
    };
  }, [topic, paramsKey, joinChannel]);

  return { data, channel, connected };
}
