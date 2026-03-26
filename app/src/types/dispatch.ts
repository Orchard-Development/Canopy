import type { DispatchPayload } from "../lib/api";

export type DispatchStatus = "pending" | "classifying" | "previewing" | "dispatched" | "failed";

export type AgentType = "auto" | "claude" | "codex" | "opencode";

export type DispatchMode = "proposal" | "dispatch";

export interface MemoryContextEntry {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface MemoryContext {
  entries: MemoryContextEntry[];
  summary: string;
}

export interface DispatchRecord {
  id: string;
  input: string;
  payload: DispatchPayload;
  timestamp: string;
  terminalSessionId: string | null;
  status: DispatchStatus;
}
