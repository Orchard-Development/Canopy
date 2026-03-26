import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel } from "phoenix";
import { api } from "../lib/api";
import { EVENTS } from "../lib/events";

export interface AgentSession {
  id: string;
  lines: string[];
  state: "running" | "waiting" | "exited" | "unknown";
  exitCode?: number;
}

const MAX_LINES = 200;

/**
 * Subscribe to live output from dispatched agent sessions via the
 * dashboard Phoenix channel. Provides per-session output buffers,
 * state tracking, and an input function for follow-ups.
 */
export function useAgentStream(channel: Channel | null) {
  const [sessions, setSessions] = useState<Map<string, AgentSession>>(
    new Map(),
  );
  const subscribedRef = useRef<Set<string>>(new Set());

  // Listen for agent:output events
  useEffect(() => {
    if (!channel) return;

    const outputRef = channel.on(
      EVENTS.agent.output,
      (payload: { session_id: string; data: string }) => {
        setSessions((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.session_id);
          if (!existing) return prev;

          const newLines = payload.data.split("\n").filter((l) => l.length > 0);
          const merged = [...existing.lines, ...newLines].slice(-MAX_LINES);
          next.set(payload.session_id, { ...existing, lines: merged });
          return next;
        });
      },
    );

    const stateRef = channel.on(
      EVENTS.session.state,
      (payload: { id: string; state: string }) => {
        setSessions((prev) => {
          const existing = prev.get(payload.id);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(payload.id, {
            ...existing,
            state: payload.state as AgentSession["state"],
          });
          return next;
        });
      },
    );

    const exitRef = channel.on(
      EVENTS.session.exited,
      (payload: { id: string; exit_code: number }) => {
        setSessions((prev) => {
          const existing = prev.get(payload.id);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(payload.id, {
            ...existing,
            state: "exited",
            exitCode: payload.exit_code,
          });
          return next;
        });

        // Auto-remove exited session after delay
        setTimeout(() => {
          setSessions((prev) => {
            const next = new Map(prev);
            next.delete(payload.id);
            return next;
          });
          subscribedRef.current.delete(payload.id);
          channel.push("unsubscribe:session", { session_id: payload.id });
        }, 8000);
      },
    );

    return () => {
      channel.off(EVENTS.agent.output, outputRef);
      channel.off(EVENTS.session.state, stateRef);
      channel.off(EVENTS.session.exited, exitRef);
    };
  }, [channel]);

  const subscribe = useCallback(
    (sessionId: string) => {
      if (!channel || subscribedRef.current.has(sessionId)) return;

      channel.push("subscribe:session", { session_id: sessionId });
      subscribedRef.current.add(sessionId);

      setSessions((prev) => {
        const next = new Map(prev);
        if (!next.has(sessionId)) {
          next.set(sessionId, {
            id: sessionId,
            lines: [],
            state: "running",
          });
        }
        return next;
      });
    },
    [channel],
  );

  const unsubscribe = useCallback(
    (sessionId: string) => {
      if (!channel || !subscribedRef.current.has(sessionId)) return;

      channel.push("unsubscribe:session", { session_id: sessionId });
      subscribedRef.current.delete(sessionId);

      setSessions((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
    },
    [channel],
  );

  const clearAll = useCallback(() => {
    for (const id of subscribedRef.current) {
      if (channel) channel.push("unsubscribe:session", { session_id: id });
    }
    subscribedRef.current.clear();
    setSessions(new Map());
  }, [channel]);

  const sendInput = useCallback(async (sessionId: string, text: string) => {
    await api.writeToSession(sessionId, text + "\r");
  }, []);

  const killSession = useCallback(async (sessionId: string) => {
    try {
      await api.killTerminal(sessionId);
    } catch {
      // Session may already be dead (stale chat, backend restarted, etc.)
    }
    // Always mark exited and schedule removal -- the backend may not broadcast
    // the event because the supervisor terminates the Worker before it
    // processes the kill, or the session may already be gone.
    setSessions((prev) => {
      const existing = prev.get(sessionId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(sessionId, { ...existing, state: "exited", exitCode: 0 });
      return next;
    });
    setTimeout(() => {
      setSessions((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
      subscribedRef.current.delete(sessionId);
    }, 2000);
  }, []);

  return { sessions, subscribe, unsubscribe, clearAll, sendInput, killSession };
}
