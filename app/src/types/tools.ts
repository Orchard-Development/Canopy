export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "calling" | "executing" | "complete" | "error";
  result?: unknown;
  isError?: boolean;
}
