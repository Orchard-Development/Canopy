import { useState, useEffect } from "react";
import { api } from "../lib/api";

export interface SessionMessage {
  role: string;
  text: string;
  ts?: string;
  images?: string[]; // base64 data URLs
}

interface UseSessionMessagesResult {
  messages: SessionMessage[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches parsed transcript messages for a session by ID.
 * Works with both PTY session IDs and Claude chat_id UUIDs.
 * Pass a changing `refreshKey` to trigger re-fetches (e.g. from channel events).
 */
export function useSessionMessages(
  sessionId: string | null,
  refreshKey: number = 0,
): UseSessionMessagesResult {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    api.getSessionMessages(sessionId)
      .then((msgs) => {
        setMessages(msgs);
        setError(null);
      })
      .catch(() => {
        // Don't clear existing messages on re-fetch failure
        if (messages.length === 0) {
          setMessages([]);
        }
      })
      .finally(() => setLoading(false));
  }, [sessionId, refreshKey]);

  return { messages, loading, error };
}
