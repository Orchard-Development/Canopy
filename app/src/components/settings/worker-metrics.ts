interface WorkerStatus {
  name: string;
  description: string;
  enabled: boolean;
  cadence: string | [string, number];
  last_run: string | null;
  tick_count: number;
  [key: string]: unknown;
}

type WorkerState = "idle" | "active" | "error" | "disabled";

interface Metric {
  label: string;
  value: string;
}

const BASE_KEYS = new Set([
  "name", "description", "enabled", "cadence", "last_run", "tick_count",
]);

const PRIMARY_METRIC: Record<string, (w: WorkerStatus) => Metric> = {
  proposer: (w) => ({
    label: "proposals/hr",
    value: String(w.proposals_this_hour ?? 0),
  }),
  reviewer: (w) => ({
    label: "in queue",
    value: String(w.queue_length ?? 0),
  }),
  extractor: (w) => ({
    label: "extracted",
    value: String(w.total_artifacts ?? 0),
  }),
  fixer: (w) => ({
    label: "errors tracked",
    value: String(w.error_count ?? 0),
  }),
  graph_builder: (w) => ({
    label: "last build",
    value: w.last_build ? timeAgo(String(w.last_build)) : "never",
  }),
  cluster_analyzer: (w) => ({
    label: "dispatched",
    value: String(w.dispatched_count ?? 0),
  }),
  memory_gc: (w) => ({
    label: "archived",
    value: String(w.total_archived ?? 0),
  }),
  auto_research: (w) => ({
    label: "phase",
    value: String(w.session_state ?? w.phase ?? "idle"),
  }),
  sync: (w) => ({
    label: "synced",
    value: `${w.files_pushed ?? 0}/${w.files_pulled ?? 0}`,
  }),
};

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export function getPrimaryMetric(worker: WorkerStatus): Metric {
  const fn = PRIMARY_METRIC[worker.name];
  if (fn) return fn(worker);
  return { label: "ticks", value: String(worker.tick_count) };
}

export function getDetailFields(worker: WorkerStatus): Metric[] {
  const fields: Metric[] = [];
  for (const [key, val] of Object.entries(worker)) {
    if (BASE_KEYS.has(key) || val == null) continue;
    const label = key.replace(/_/g, " ");
    if (typeof val === "object") {
      fields.push({ label, value: JSON.stringify(val) });
    } else {
      fields.push({ label, value: String(val) });
    }
  }
  return fields;
}

export function getWorkerState(worker: WorkerStatus): WorkerState {
  if (!worker.enabled) return "disabled";
  if (worker.active_session) return "active";
  const errors = worker.recent_errors;
  if (Array.isArray(errors) && errors.length > 0) return "error";
  if (worker.deferred) return "idle";
  return "idle";
}

export function formatCadence(cadence: string | [string, number]): string {
  if (cadence === "event") return "event-driven";
  if (Array.isArray(cadence) && cadence[0] === "timer") {
    const ms = cadence[1];
    if (ms >= 60_000) return `every ${Math.round(ms / 60_000)}m`;
    return `every ${Math.round(ms / 1_000)}s`;
  }
  return String(cadence);
}

export const FRIENDLY_NAMES: Record<string, string> = {
  proposer: "Proposal Drafting",
  reviewer: "Proposal Review",
  extractor: "Knowledge Extraction",
  fixer: "Auto-Fix",
  graph_builder: "Dependency Graph",
  cluster_analyzer: "Cluster Analysis",
  memory_gc: "Memory Cleanup",
  auto_research: "Auto Research",
  sync: "File Sync",
};

export const STATE_COLORS: Record<WorkerState, string> = {
  idle: "#43a047",
  active: "#1e88e5",
  error: "#e53935",
  disabled: "#9e9e9e",
};

export type { WorkerStatus, WorkerState, Metric };
