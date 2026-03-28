import { useCallback, useEffect, useRef } from "react";
import { useChannel } from "./useChannel";
import { usePersistedState } from "./usePersistedState";

export type Severity = "info" | "success" | "warning" | "error";

export interface ActivityEntry {
  id: string;
  summary: string;
  timestamp: string;
  topic: string;
  severity: Severity;
  sessionId?: string;
}

const MAX_ENTRIES = 50;

/** Topics worth surfacing in the activity feed (prefix match). */
const INTERESTING_PREFIXES = [
  "sessions/",
  "session_events/",
  "agent_events/",
  "user_activity/",
  "state:",
  "terminal/action",
  "config_seeder/",
  "pollinator/",
];

function isInteresting(topic: string): boolean {
  return INTERESTING_PREFIXES.some((p) => topic.startsWith(p));
}

function classifyEvent(
  topic: string,
  payload: Record<string, unknown>,
): { summary: string; severity: Severity; sessionId?: string } | null {
  // Session started
  if (topic.match(/^sessions\/(.+)\/started$/)) {
    const id = topic.split("/")[1];
    const info = payload.info as Record<string, unknown> | undefined;
    const label = info?.label || info?.tool || id.slice(0, 8);
    return { summary: `Session started: ${label}`, severity: "info", sessionId: id };
  }

  // Session exited
  if (topic.match(/^sessions\/(.+)\/exited$/)) {
    const id = topic.split("/")[1];
    const code = payload.exit_code;
    const ok = code === 0 || code === null || code === undefined;
    return {
      summary: `Session exited${code != null ? ` (code ${code})` : ""}`,
      severity: ok ? "info" : "error",
      sessionId: id,
    };
  }

  // Session state change
  if (topic.match(/^sessions\/(.+)\/state$/)) {
    const id = topic.split("/")[1];
    const state = payload.state as string | undefined;
    if (state === "waiting") {
      return { summary: "Session waiting for input", severity: "warning", sessionId: id };
    }
    // Skip noisy running states
    return null;
  }

  // Errors
  if (topic.match(/^session_events\/(.+)\/error$/)) {
    const id = topic.split("/")[1];
    const line = (payload.payload as Record<string, unknown>)?.line as string | undefined;
    const preview = line ? line.slice(0, 120) : "Error detected";
    return { summary: preview, severity: "error", sessionId: id };
  }

  // Test results
  if (topic.match(/^session_events\/(.+)\/test_result$/)) {
    const id = topic.split("/")[1];
    const p = payload.payload as Record<string, unknown> | undefined;
    const line = p?.line as string | undefined;
    const failures = p?.failures as number | undefined;
    const severity: Severity = failures && failures > 0 ? "error" : "success";
    return { summary: line?.slice(0, 120) || "Test results", severity, sessionId: id };
  }

  // Stuck prompts
  if (topic.match(/^session_events\/(.+)\/stuck$/)) {
    const id = topic.split("/")[1];
    const p = payload.payload as Record<string, unknown> | undefined;
    const prompt = p?.prompt as string | undefined;
    return {
      summary: `Stuck: ${prompt?.slice(0, 100) || "awaiting input"}`,
      severity: "warning",
      sessionId: id,
    };
  }

  // User activity events
  if (topic.startsWith("user_activity/")) {
    const type = topic.split("/")[1];
    const data = payload as Record<string, unknown>;
    const actData = (data.data || data) as Record<string, unknown>;
    const LABELS: Record<string, string> = {
      app_switch: `Switched to ${actData.to_app || "app"}`,
      window_change: `${actData.app || "App"}: ${(actData.to_title as string)?.slice(0, 60) || "new window"}`,
      user_idle: "User idle",
      user_returned: "User returned",
      window_focus: "Orchard focused",
      window_blur: "Orchard unfocused",
      typing_start: "Typing",
      typing_stop: "Stopped typing",
      view_navigate: `Navigated to ${actData.to || "view"}`,
      clipboard_paste: "Pasted content",
      click: `Clicked ${actData.tag || "element"}`,
    };
    return { summary: LABELS[type] || `User: ${type}`, severity: "info" };
  }

  // Agent events
  if (topic.startsWith("agent_events/")) {
    const parts = topic.split("/");
    const agentType = parts[1];
    const event = parts[2];
    return { summary: `Agent ${agentType}: ${event}`, severity: "info" };
  }

  // Terminal actions
  if (topic === "terminal/action") {
    const action = payload.action as Record<string, unknown> | undefined;
    const label = action?.label || action?.type || "action created";
    return { summary: `Terminal action: ${label}`, severity: "info" };
  }

  // Config seeder
  if (topic.startsWith("config_seeder/")) {
    const action = topic.split("/")[1];
    return { summary: `Config updated: ${action}`, severity: "info" };
  }

  // Workspace pulse (pollinator hive)
  if (topic === "pollinator/pulse") {
    const summary = (payload.summary as string) || "Workspace pulse updated";
    return { summary, severity: "info" };
  }

  // Session context (pollinator hive)
  if (topic.match(/^pollinator\/(.+)\/context$/)) {
    const id = topic.split("/")[1];
    const summary = (payload.summary as string) || "Session context updated";
    return { summary, severity: "info", sessionId: id };
  }

  // Skip raw nectar events (too noisy for activity feed)
  if (topic.match(/^pollinator\/(.+)\/nectar$/)) {
    return null;
  }

  return null;
}

/**
 * Subscribes to the Phoenix "monitor" channel and surfaces meaningful
 * events as an activity feed.
 */
export interface WorkspacePulse {
  summary: string;
  sessionCount: number;
  timestamp: string;
}

/**
 * Subscribes to the Phoenix "monitor" channel and surfaces meaningful
 * events as an activity feed. Also tracks the latest workspace pulse
 * from the pollinator hive.
 */
export function useActivityFeed() {
  const { channel, connected } = useChannel("monitor");
  const [entries, setEntries] = usePersistedState<ActivityEntry[]>("activity.entries", []);
  const [lastSync, setLastSync] = usePersistedState<string | null>("activity.lastSync", null);
  const [pulseRaw, setPulseRaw] = usePersistedState<Record<string, unknown> | null>("activity.pulse", null);
  const pulse: WorkspacePulse | null = pulseRaw
    ? { summary: pulseRaw.summary as string, sessionCount: pulseRaw.sessionCount as number, timestamp: pulseRaw.timestamp as string }
    : null;
  const connectedRef = useRef(connected);
  connectedRef.current = connected;

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(
      "event",
      (data: { topic: string; payload: unknown; timestamp: number }) => {
        if (!isInteresting(data.topic)) return;

        const payload = (data.payload ?? {}) as Record<string, unknown>;
        const ts = new Date(data.timestamp).toISOString();

        // Capture workspace pulse separately (pinned, not in timeline)
        if (data.topic === "pollinator/pulse") {
          setPulseRaw({
            summary: (payload.summary as string) || "",
            sessionCount: (payload.session_count as number) || 0,
            timestamp: ts,
          });
          setLastSync(ts);
          return;
        }

        const classified = classifyEvent(data.topic, payload);
        if (!classified) return;

        setLastSync(ts);

        setEntries((prev) => {
          // Deduplicate: if summary matches last entry, update timestamp
          const last = prev.length > 0 ? prev[prev.length - 1] : null;
          if (last && last.summary === classified.summary) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, timestamp: ts };
            return updated;
          }

          const entry: ActivityEntry = {
            id: `${data.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
            summary: classified.summary,
            timestamp: ts,
            topic: data.topic,
            severity: classified.severity,
            sessionId: classified.sessionId,
          };
          return [...prev.slice(-(MAX_ENTRIES - 1)), entry];
        });
      },
    );

    return () => {
      channel.off("event", ref);
    };
  }, [channel]);

  const clear = useCallback(() => {
    setEntries([]);
    setPulseRaw(null);
  }, []);

  return { entries, pulse, lastSync, clear, connected };
}
