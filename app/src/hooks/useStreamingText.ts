import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel } from "phoenix";
import { EVENTS } from "../lib/events";
import { filterPtyChunk, initialFilterState } from "../lib/filterPtyChunk";
import type { FilterState } from "../lib/filterPtyChunk";

export type StreamingState = "idle" | "streaming" | "stop";

export interface UseStreamingTextResult {
  text: string;
  state: StreamingState;
  streamingStartedAt: number | null;
  reset: () => void;
}

const MAX_BYTES = 32 * 1024;

/**
 * Accumulates agent:output PTY chunks for a session between prompt and stop
 * events. Applies a text filter to strip tool markup and status chrome.
 *
 * Uses channel.on() directly (not useChannelEvent) so every chunk is captured,
 * not just the most recent payload.
 *
 * The caller (PrettyTerminal) must call reset() once committed assistant_text
 * entries arrive from useHookLog, which transitions state from "stop" -> "idle"
 * and clears the buffer.
 */
export function useStreamingText(
  sessionId: string | null,
  channel: Channel | null,
): UseStreamingTextResult {
  const [text, setText] = useState("");
  const [streamState, setStreamState] = useState<StreamingState>("idle");
  const [streamingStartedAt, setStreamingStartedAt] = useState<number | null>(null);

  const bufferRef = useRef("");
  const filterStateRef = useRef<FilterState>(initialFilterState());
  const stateRef = useRef<StreamingState>("idle");

  const reset = useCallback(() => {
    bufferRef.current = "";
    filterStateRef.current = initialFilterState();
    stateRef.current = "idle";
    setText("");
    setStreamState("idle");
    setStreamingStartedAt(null);
  }, []);

  // Reset when sessionId changes
  useEffect(() => {
    reset();
  }, [sessionId, reset]);

  useEffect(() => {
    if (!channel || !sessionId) return;

    const promptRef = channel.on(
      EVENTS.agent.prompt,
      (payload: { session_id?: string }) => {
        if (payload.session_id !== sessionId) return;
        bufferRef.current = "";
        filterStateRef.current = initialFilterState();
        stateRef.current = "streaming";
        setText("");
        setStreamState("streaming");
        setStreamingStartedAt(Date.now());
      },
    );

    const outputRef = channel.on(
      EVENTS.agent.output,
      (payload: { session_id: string; data: string }) => {
        if (payload.session_id !== sessionId) return;
        if (stateRef.current !== "streaming") return;

        const result = filterPtyChunk(payload.data, filterStateRef.current);
        filterStateRef.current = result.state;

        if (!result.text) return;

        let next = bufferRef.current + result.text;
        if (next.length > MAX_BYTES) {
          next = next.slice(next.length - MAX_BYTES);
        }
        bufferRef.current = next;
        setText(next);
      },
    );

    const lifecycleRef = channel.on(
      EVENTS.agent.lifecycle,
      (payload: { session_id?: string }) => {
        if (payload.session_id !== sessionId) return;
        if (stateRef.current !== "streaming") return;
        stateRef.current = "stop";
        setStreamState("stop");
      },
    );

    return () => {
      channel.off(EVENTS.agent.prompt, promptRef);
      channel.off(EVENTS.agent.output, outputRef);
      channel.off(EVENTS.agent.lifecycle, lifecycleRef);
    };
  }, [channel, sessionId]);

  return { text, state: streamState, streamingStartedAt, reset };
}
