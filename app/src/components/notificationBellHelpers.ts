import type { EngineEvent, EventActionMeta, EventSeverity, EventTier } from "../hooks/useEventBus";

export interface DayGroup {
  label: string;
  dateKey: string;
  events: EngineEvent[];
  /** @deprecated Kept for backward compat with EventCluster consumers */
  startTimestamp: number;
}

export interface SummaryRow {
  category: string;
  label: string;
  count: number;
  events: EngineEvent[];
  severity: EventSeverity;
  latestTimestamp: number;
}

export type { EventActionMeta, EventSeverity, EventTier };

function dayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function groupByDay(events: EngineEvent[]): DayGroup[] {
  const noteworthy = events.filter((e) => e.tier === "noteworthy");
  const grouped = new Map<string, EngineEvent[]>();
  for (const event of noteworthy) {
    const key = dateKey(event.timestamp);
    const existing = grouped.get(key) ?? [];
    existing.push(event);
    grouped.set(key, existing);
  }
  const groups: DayGroup[] = [];
  for (const [key, dayEvents] of grouped) {
    dayEvents.sort((a, b) => b.timestamp - a.timestamp);
    groups.push({ label: dayLabel(new Date(dayEvents[0].timestamp)), dateKey: key, events: dayEvents, startTimestamp: dayEvents[0].timestamp });
  }
  groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return groups;
}

const SUMMARY_LABELS: Record<string, (count: number) => string> = {
  autocommit: (n) => `${n} commit${n === 1 ? "" : "s"} saved`,
  autopush: (n) => `${n} push${n === 1 ? "" : "es"} completed`,
  session: (n) => `${n} session${n === 1 ? "" : "s"} completed`,
  subagent: (n) => `${n} sub-task${n === 1 ? "" : "s"} ran`,
  task: (n) => `${n} task${n === 1 ? "" : "s"} completed`,
};

export function collapseToSummaries(events: EngineEvent[]): SummaryRow[] {
  const byCategory = new Map<string, EngineEvent[]>();
  const standalone: SummaryRow[] = [];
  for (const event of events) {
    if (event.actionMeta) {
      standalone.push({ category: event.category, label: event.message, count: 1, events: [event], severity: event.severity, latestTimestamp: event.timestamp });
      continue;
    }
    const existing = byCategory.get(event.category) ?? [];
    existing.push(event);
    byCategory.set(event.category, existing);
  }
  const summaries: SummaryRow[] = [...standalone];
  for (const [category, catEvents] of byCategory) {
    const labelFn = SUMMARY_LABELS[category];
    if (catEvents.length > 1 && labelFn) {
      summaries.push({ category, label: labelFn(catEvents.length), count: catEvents.length, events: catEvents, severity: catEvents[0].severity, latestTimestamp: Math.max(...catEvents.map((e) => e.timestamp)) });
    } else {
      for (const event of catEvents) {
        summaries.push({ category: event.category, label: event.message, count: 1, events: [event], severity: event.severity, latestTimestamp: event.timestamp });
      }
    }
  }
  summaries.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  return summaries;
}

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

const TOOL_LABELS: Record<string, string> = {
  Bash: "run a command",
  Read: "read a file",
  Write: "create a file",
  Edit: "edit a file",
  Grep: "search files",
  Glob: "find files",
  WebFetch: "fetch a webpage",
  WebSearch: "search the web",
  AskUserQuestion: "your input",
  NotebookEdit: "edit a notebook",
};

export function humanizeTool(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName.toLowerCase();
}

export function humanizeDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)}h`;
}

/** @deprecated Use DayGroup instead */
export type EventCluster = DayGroup;
/** @deprecated Use groupByDay instead */
export const groupEventsByTime = groupByDay;
