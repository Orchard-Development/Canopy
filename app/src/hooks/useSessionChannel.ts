import { useState, useEffect, useCallback, useRef } from "react";
import { useChannel } from "./useChannel";
import type { Channel } from "phoenix";

interface SessionInfo {
  [key: string]: unknown;
}

interface OutputEvent {
  /** Base64-encoded terminal data */
  data: string;
}

interface LabelEvent {
  label: string;
}

interface SummaryEvent {
  summary: string;
}

interface UseSessionChannelResult {
  /** Session info returned on join */
  info: SessionInfo | null;
  /** Label pushed by the server */
  label: string | null;
  /** Summary pushed by the server */
  summary: string | null;
  /** Whether the channel is connected */
  connected: boolean;
  /** Send terminal input to the session */
  sendInput: (data: string) => void;
  /** Resize the PTY */
  resize: (cols: number, rows: number) => void;
  /** Toggle the poker (auto-prompt) feature */
  togglePoker: (enabled: boolean) => void;
  /** Kill the session */
  kill: () => void;
}

/**
 * Decode a base64-encoded string to a UTF-8 string.
 */
function decodeBase64(encoded: string): string {
  try {
    const bytes = atob(encoded);
    const uint8 = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      uint8[i] = bytes.charCodeAt(i);
    }
    return new TextDecoder().decode(uint8);
  } catch {
    return encoded;
  }
}

/**
 * Join a session-specific Phoenix channel ("session:{id}").
 *
 * Handles output streaming (base64 decoding), label/summary updates,
 * and provides methods to send input, resize, toggle poker, and kill.
 *
 * @param sessionId - The terminal session ID, or null to skip joining.
 * @param onOutput  - Callback invoked with decoded terminal output data.
 */
export function useSessionChannel(
  sessionId: string | null,
  onOutput?: (data: string) => void,
): UseSessionChannelResult {
  const topic = sessionId ? `session:${sessionId}` : null;
  const { data, channel, connected } =
    useChannel<{ info: SessionInfo }>(topic);

  const [label, setLabel] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const onOutputRef = useRef(onOutput);
  onOutputRef.current = onOutput;

  // Listen for pushed events
  useEffect(() => {
    if (!channel) return;

    const outputRef = channel.on("output", (evt: OutputEvent) => {
      const decoded = decodeBase64(evt.data);
      onOutputRef.current?.(decoded);
    });

    const labelRef = channel.on("label", (evt: LabelEvent) => {
      setLabel(evt.label);
    });

    const summaryRef = channel.on("summary", (evt: SummaryEvent) => {
      setSummary(evt.summary);
    });

    return () => {
      channel.off("output", outputRef);
      channel.off("label", labelRef);
      channel.off("summary", summaryRef);
      setLabel(null);
      setSummary(null);
    };
  }, [channel]);

  const pushToChannel = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (!channel) return;
      (channel as Channel).push(event, payload);
    },
    [channel],
  );

  const sendInput = useCallback(
    (inputData: string) => {
      pushToChannel("input", { data: inputData });
    },
    [pushToChannel],
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      pushToChannel("resize", { cols, rows });
    },
    [pushToChannel],
  );

  const togglePoker = useCallback(
    (enabled: boolean) => {
      pushToChannel("poker", { enabled });
    },
    [pushToChannel],
  );

  const kill = useCallback(() => {
    pushToChannel("kill", {});
  }, [pushToChannel]);

  return {
    info: data?.info ?? null,
    label,
    summary,
    connected,
    sendInput,
    resize,
    togglePoker,
    kill,
  };
}
