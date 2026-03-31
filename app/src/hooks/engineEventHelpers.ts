import { useEffect, useRef } from "react";
import type { Channel } from "phoenix";
import type { useEventBus, EventSeverity } from "./useEventBus";

export interface AgentPayload {
  event?: string;
  agent_type?: string;
  session_id?: string;
  tool_name?: string;
  data?: Record<string, unknown>;
  received_at?: string;
}

export type Formatter = (p: AgentPayload) => { message: string; severity: EventSeverity };

export function useChannelSub(
  channel: Channel | null,
  event: string,
  handler: (payload: Record<string, unknown>) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!channel) return;
    const ref = channel.on(event, (payload: Record<string, unknown>) => {
      console.debug("[engine-event]", event, payload);
      handlerRef.current(payload);
    });
    return () => { channel.off(event, ref); };
  }, [channel, event]);
}

export function useAgentEvent(
  channel: Channel | null,
  emit: ReturnType<typeof useEventBus>["emit"],
  channelEvent: string,
  category: string,
  format: Formatter,
): void {
  const formatRef = useRef(format);
  formatRef.current = format;
  const emitRef = useRef(emit);
  emitRef.current = emit;
  useEffect(() => {
    if (!channel) return;
    const ref = channel.on(channelEvent, (payload: AgentPayload) => {
      console.debug("[engine-event]", channelEvent, payload);
      const { message, severity } = formatRef.current(payload);
      emitRef.current({
        category,
        event: payload.event || channelEvent,
        message,
        severity,
        data: payload.data,
      });
    });
    return () => { channel.off(channelEvent, ref); };
  }, [channel, channelEvent, category]);
}

export function stripPrefix(event?: string): string {
  return (event || "").replace("hook/", "");
}

export function snakeToWords(s: string): string {
  return s.replace(/_/g, " ");
}
