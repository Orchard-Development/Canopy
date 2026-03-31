import type { EngineEvent, EventActionMeta, EventSeverity } from "../hooks/useEventBus";

export interface EventCluster {
  label: string;
  events: EngineEvent[];
  startTimestamp: number;
}

export type { EventActionMeta, EventSeverity };

const CLUSTER_GAP_MS = 60_000; // 60 seconds

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) {
    const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Today at ${time}`;
  }
  if (diffDay === 1) {
    const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Yesterday at ${time}`;
  }
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatExactTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function actionLabel(meta: EventActionMeta): string {
  switch (meta.type) {
    case "focus-session": return "Focus";
    case "view-proposal": return "View";
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  tool: "Tool",
  session: "Session",
  engine: "System",
  prompt: "Prompt",
  subagent: "Agent",
  proposal: "Proposal",
  autocommit: "Git",
  autopush: "Git",
  autopull: "Git",
  task: "Task",
  context: "Context",
  permission: "Permission",
  notification: "Notice",
  project: "Project",
  analysis: "Analysis",
  skill: "Skill",
};

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export const SEVERITY_COLOR: Record<EventSeverity, string> = {
  success: "success.main",
  error: "error.main",
  warning: "warning.main",
  info: "info.main",
};

/**
 * Groups events into time clusters. Events within 60s of each other form one cluster.
 * Returns clusters ordered newest-first.
 */
export function groupEventsByTime(events: EngineEvent[]): EventCluster[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const clusters: EventCluster[] = [];
  let current: EngineEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.timestamp - curr.timestamp <= CLUSTER_GAP_MS) {
      current.push(curr);
    } else {
      clusters.push({
        label: formatRelativeTime(current[current.length - 1].timestamp),
        events: current,
        startTimestamp: current[0].timestamp,
      });
      current = [curr];
    }
  }

  clusters.push({
    label: formatRelativeTime(current[current.length - 1].timestamp),
    events: current,
    startTimestamp: current[0].timestamp,
  });

  return clusters;
}
