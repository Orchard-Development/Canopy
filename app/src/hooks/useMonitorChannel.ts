import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { MonitorChannelContext } from "@/contexts/MonitorChannelContext";
import type { EventMessage } from "../components/events/types";

const MAX_MESSAGES = 500;

/**
 * Hook that uses the shared "monitor" Phoenix channel and collects all
 * PubSub events into a buffered message list.
 *
 * All consumers share one channel join via MonitorChannelProvider.
 */
export function useMonitorChannel() {
  const { channel, connected } = useContext(MonitorChannelContext);
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [paused, setPaused] = useState(false);
  const bufferRef = useRef<EventMessage[]>([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(
      "event",
      (data: { topic: string; payload: unknown; timestamp: number }) => {
        const msg: EventMessage = {
          id: `${data.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
          topic: data.topic,
          payload: data.payload,
          timestamp: data.timestamp,
        };

        if (pausedRef.current) {
          bufferRef.current.push(msg);
          if (bufferRef.current.length > MAX_MESSAGES) {
            bufferRef.current = bufferRef.current.slice(-MAX_MESSAGES);
          }
        } else {
          setMessages((prev) => {
            const next = [...prev, msg];
            return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
          });
        }
      },
    );

    return () => {
      channel.off("event", ref);
    };
  }, [channel]);

  const resume = useCallback(() => {
    setPaused(false);
    setMessages((prev) => {
      const merged = [...prev, ...bufferRef.current];
      bufferRef.current = [];
      return merged.length > MAX_MESSAGES ? merged.slice(-MAX_MESSAGES) : merged;
    });
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    bufferRef.current = [];
  }, []);

  const publish = useCallback(
    (topic: string, payload: unknown) => {
      channel?.push("publish", { topic, payload });
    },
    [channel],
  );

  return {
    messages,
    connected,
    paused,
    setPaused: (v: boolean) => {
      if (!v) resume();
      else setPaused(true);
    },
    clear,
    publish,
    channel,
  };
}
