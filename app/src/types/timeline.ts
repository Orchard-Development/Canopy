import type { ToolCall } from "./tools";

export type TimelineItemType =
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "injected_message"
  | "collab_event"
  | "remote_task_event"
  | "session_lifecycle";

export type TimelineTier = "primary" | "supporting" | "ambient";

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  timestamp: string;
  sessionId: string;
  tier: TimelineTier;
  data: Record<string, unknown>;
}

export interface UserMessageData {
  role: "user";
  text: string;
  images?: string[];
}

export interface AssistantMessageData {
  role: "assistant";
  text: string;
  toolCalls?: ToolCall[];
}

export interface ToolCallData {
  name: string;
  input?: Record<string, unknown>;
  result?: string;
  duration_ms?: number;
}

export interface InjectedMessageData {
  sender: {
    userId: string;
    displayName: string;
    machineId?: string;
  };
  text: string;
}

export interface CollabEventData {
  action: "watch" | "join" | "leave" | "approve" | "reject" | "trust_always";
  actor: string;
}

export interface RemoteTaskEventData {
  intent: string;
  state: string;
  from: string;
  to: string;
  digest?: string;
}

export interface SessionLifecycleData {
  event: "started" | "idle" | "ended";
  exitCode?: number;
}

export interface TimelineResponse {
  items: TimelineItem[];
  hasMore: boolean;
}
