import type { DispatchPayload } from "../lib/api";
import type { ToolCall } from "./tools";

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  /** Local URL served by the engine (e.g. /api/playground/uploads/...) */
  url: string;
  size: number;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  /** True when tokens were estimated from text length, not reported by the API. */
  estimated?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  /** Files attached to this message (images, PDFs, CSVs, etc.) */
  attachments?: Attachment[];
  dispatch?: { suggested: boolean; quick: boolean; summary: string } | null;
  /** Pre-built dispatch payload ready for immediate use. */
  dispatchPayload?: DispatchPayload | null;
  /** Tool calls made during this assistant response. */
  toolCalls?: ToolCall[];
  /** Session ID of a dispatched agent, set when dispatch_to_agent completes. */
  agentSessionId?: string;
  /** Inline action button rendered alongside system messages. */
  action?: { label: string; path?: string; onAction?: () => void };
}
