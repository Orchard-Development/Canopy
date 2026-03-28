import { useState, useEffect } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent } from "./useChannelEvent";

interface SessionStartedEvent {
  id: string;
  info: Record<string, unknown>;
}

interface SessionExitedEvent {
  id: string;
  exit_code: number;
}

interface SessionStateEvent {
  id: string;
  state: string;
}

interface StatePayload<T> {
  data: T;
}

interface DashboardJoinPayload {
  sessions: unknown[];
  stats: Record<string, unknown>;
  digests: Record<string, unknown>;
}

interface DashboardState {
  sessions: unknown[];
  stats: Record<string, unknown>;
  digests: Record<string, unknown>;
  connected: boolean;
}

/**
 * Join the "dashboard" Phoenix channel and maintain live state.
 *
 * Receives the full state on join and incremental updates via pushes.
 */
export function useDashboard(): DashboardState {
  const { data: rawData, channel, connected } = useDashboardChannel();
  const data = rawData as DashboardJoinPayload | null;

  const [sessions, setSessions] = useState<unknown[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [digests, setDigests] = useState<Record<string, unknown>>({});

  // Seed from join payload
  useEffect(() => {
    if (!data) return;
    setSessions(data.sessions);
    setStats(data.stats);
    setDigests(data.digests);
  }, [data]);

  // Live session events
  const sessionStarted = useChannelEvent<SessionStartedEvent>(
    channel,
    "session:started",
  );
  const sessionExited = useChannelEvent<SessionExitedEvent>(
    channel,
    "session:exited",
  );

  useEffect(() => {
    if (!sessionStarted) return;
    setSessions((prev) => [...prev, sessionStarted]);
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionExited) return;
    setSessions((prev) =>
      (prev as Array<{ id?: string }>).filter(
        (s) => s.id !== sessionExited.id,
      ),
    );
  }, [sessionExited]);

  // Full state replacements pushed by the server
  const stateSessions = useChannelEvent<StatePayload<unknown[]>>(
    channel,
    "state:sessions",
  );
  const stateStats = useChannelEvent<StatePayload<Record<string, unknown>>>(
    channel,
    "state:stats",
  );

  useEffect(() => {
    if (stateSessions?.data) setSessions(stateSessions.data);
  }, [stateSessions]);

  useEffect(() => {
    if (stateStats?.data) setStats(stateStats.data);
  }, [stateStats]);

  return { sessions, stats, digests, connected };
}
