import { useEffect, useRef } from "react";
import type { Channel } from "phoenix";
import { useEventBus, type EventSeverity, type EventActionMeta } from "./useEventBus";
import { EVENTS } from "../lib/events";

/**
 * Subscribes to engine Phoenix Channel events and emits them into the EventBus.
 * Both toasts and the notification bell consume from the bus independently.
 */
export function useEngineEvents(channel: Channel | null): void {
  console.debug("[useEngineEvents] channel=", channel ? "connected" : "null");
  const { emit } = useEventBus();

  // -- Existing engine events -----------------------------------------------

  useChannelSub(channel, EVENTS.toast.show, (payload: Record<string, unknown>) => {
    const sessionId = payload.session_id as string | undefined;
    const actionMeta: EventActionMeta | undefined = sessionId
      ? { type: "focus-session", sessionId, label: (payload.session_label as string) || "Terminal" }
      : undefined;
    emit({
      category: "engine",
      event: "toast",
      message: (payload.message as string) || "Agent session completed",
      severity: ((payload.status as string) || "info") as EventSeverity,
      data: payload,
      actionMeta,
    });
  });

  useChannelSub(channel, EVENTS.session.exited, (payload: Record<string, unknown>) => {
    const exitCode = payload.exitCode as number | undefined;
    if (exitCode && exitCode !== 0) {
      emit({
        category: "session",
        event: "exited",
        message: `Session "${payload.label || "unknown"}" exited with code ${exitCode}`,
        severity: "error",
        data: payload,
      });
    }
  });

  useChannelSub(channel, EVENTS.autoCommit.status, (payload: Record<string, unknown>) => {
    if (payload.error) {
      emit({
        category: "autocommit",
        event: "error",
        message: `Auto-commit failed: ${payload.error}`,
        severity: "error",
        data: payload,
      });
    } else if (payload.message) {
      emit({
        category: "autocommit",
        event: "success",
        message: payload.message as string,
        severity: "success",
        data: payload,
      });
    }
  });

  useChannelSub(channel, EVENTS.autoPull.status, (payload: Record<string, unknown>) => {
    const data = (payload.data || payload) as Record<string, unknown>;
    const status = data.status as string;
    if (status === "failed") {
      emit({
        category: "autopull",
        event: "error",
        message: `Auto-pull failed: ${data.project || ""}`,
        severity: "error",
        data,
      });
    }
  });

  useChannelSub(channel, EVENTS.autoPush.status, (payload: Record<string, unknown>) => {
    const data = (payload.data || payload) as Record<string, unknown>;
    const status = data.status as string;
    if (status === "build_failed" || status === "rebase_failed" || status === "push_failed") {
      emit({
        category: "autopush",
        event: "error",
        message: `Auto-push ${status.replace("_", " ")}: ${data.project || ""}${data.reason ? ` - ${(data.reason as string).slice(0, 100)}` : ""}`,
        severity: "error",
        data,
      });
    } else if (status === "ok") {
      emit({
        category: "autopush",
        event: "success",
        message: `Pushed ${data.pushedCommits || 0} commit(s)`,
        severity: "success",
        data,
      });
    }
  });

  useChannelSub(channel, EVENTS.proposals.created, (payload: Record<string, unknown>) => {
    const d = (payload.data || {}) as Record<string, string>;
    const label = d.title || d.slug || "";
    emit({
      category: "proposal",
      event: "created",
      message: `Proposal ready${label ? `: ${label}` : ""}`,
      severity: "success",
      data: payload,
      actionMeta: d.slug ? { type: "view-proposal", slug: d.slug } : undefined,
    });
  });

  useChannelSub(channel, EVENTS.project.created, (payload: Record<string, unknown>) => {
    const d = (payload.data || {}) as Record<string, string>;
    emit({
      category: "project",
      event: "created",
      message: `Project created: ${d.name || "New project"}`,
      severity: "success",
      data: payload,
    });
  });

  useChannelSub(channel, EVENTS.analysis.complete, (payload: Record<string, unknown>) => {
    emit({
      category: "analysis",
      event: "complete",
      message: `Analysis complete${payload.label ? `: ${payload.label}` : ""}`,
      severity: "info",
      data: payload,
    });
  });

  useChannelSub(channel, EVENTS.analysis.error, (payload: Record<string, unknown>) => {
    emit({
      category: "analysis",
      event: "error",
      message: (payload.message as string) || "Analysis failed",
      severity: "error",
      data: payload,
    });
  });

  // -- Agent lifecycle events (from Claude Code hooks) ----------------------

  useAgentEvent(channel, emit, EVENTS.agent.lifecycle, "session", (p) => {
    const action = stripPrefix(p.event);
    const cwd = (p.data?.cwd as string) || "";
    const dir = cwd ? cwd.split("/").pop() : "";
    if (action === "session_start") {
      return { message: `Agent started${dir ? ` in ${dir}` : ""}`, severity: "info" };
    }
    if (action === "session_end" || action === "stop") {
      return { message: "Agent finished", severity: "success" };
    }
    if (action === "stop_failure") {
      const reason = (p.data?.reason as string) || "";
      return { message: `Agent failed to stop${reason ? `: ${reason}` : ""}`, severity: "error" };
    }
    return { message: `Session ${snakeToWords(action)}`, severity: "info" };
  });

  // Toast when an agent session ends -- no auto-focus
  useChannelSub(channel, EVENTS.agent.lifecycle, (payload: Record<string, unknown>) => {
    const action = stripPrefix(payload.event as string | undefined);
    if (action !== "session_end" && action !== "stop") return;
    const sessionId = payload.session_id as string | undefined;
    if (!sessionId) return;
    const label = (payload.agent_type as string) || "Agent";
    emit({
      category: "agent",
      event: "session_end",
      message: `${label} session ended`,
      severity: "info",
      data: payload,
      actionMeta: { type: "focus-session", sessionId, label },
    });
  });

  useAgentEvent(channel, emit, EVENTS.agent.tool, "tool", (p) => {
    const tool = p.tool_name || (p.data?.tool_name as string) || "unknown";
    const action = stripPrefix(p.event);
    if (action === "pre_tool_use") return { message: `Using ${tool}`, severity: "info" };
    if (action === "post_tool_use_failure") return { message: `${tool} failed`, severity: "error" };
    return { message: `${tool} completed`, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.subagent, "subagent", (p) => {
    const action = stripPrefix(p.event);
    const desc = (p.data?.description as string) || (p.data?.subagent_type as string) || "";
    if (action === "subagent_start") {
      return { message: `Subagent spawned${desc ? `: ${desc}` : ""}`, severity: "info" };
    }
    return { message: `Subagent finished${desc ? `: ${desc}` : ""}`, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.compact, "context", (p) => {
    const label = stripPrefix(p.event) === "pre_compact" ? "compacting" : "compacted";
    return { message: `Context ${label}`, severity: "warning" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.prompt, "prompt", (p) => {
    const prompt = (p.data?.prompt as string) || (p.data?.user_prompt as string) || "";
    const truncated = prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt;
    return { message: truncated ? `Prompt: ${truncated}` : "Prompt submitted", severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.permission, "permission", (p) => {
    const tool = p.tool_name || (p.data?.tool_name as string) || "unknown";
    return { message: `Permission requested: ${tool}`, severity: "warning" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.config, "config", (p) => {
    const label = snakeToWords(stripPrefix(p.event));
    const file = (p.data?.file_path as string) || (p.data?.config_key as string) || "";
    return { message: `${capitalize(label)}${file ? `: ${file}` : ""}`, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.worktree, "worktree", (p) => {
    const action = stripPrefix(p.event) === "worktree_create" ? "created" : "removed";
    return { message: `Worktree ${action}`, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.elicitation, "elicitation", (p) => {
    const server = (p.data?.mcp_server as string) || "MCP";
    return { message: `${server} elicitation`, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.notification, "notification", (p) => {
    const body = (p.data?.body as string) || (p.data?.title as string) || "Notification";
    return { message: body, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.task, "task", (p) => {
    const desc = (p.data?.task_description as string) || (p.data?.task_name as string) || "";
    const truncated = desc.length > 80 ? `${desc.slice(0, 80)}...` : desc;
    return { message: truncated ? `Task done: ${truncated}` : "Task completed", severity: "success" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.hook, "agent", (p) => {
    const label = snakeToWords(stripPrefix(p.event));
    return { message: capitalize(label), severity: "info" };
  });

  // Catch-all for non-hook agent events (e.g. from Python emitter)
  useAgentEvent(channel, emit, EVENTS.agent.event, "agent", (p) => {
    const label = snakeToWords(p.event || "event");
    return { message: capitalize(label), severity: "info" };
  });
}

// -- Helpers ------------------------------------------------------------------

interface AgentPayload {
  event?: string;
  agent_type?: string;
  session_id?: string;
  tool_name?: string;
  data?: Record<string, unknown>;
  received_at?: string;
}

type Formatter = (p: AgentPayload) => { message: string; severity: EventSeverity };

function useChannelSub(
  channel: Channel | null,
  event: string,
  handler: (payload: Record<string, unknown>) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!channel) return;
    const ref = channel.on(event, (payload: Record<string, unknown>) => {
      console.debug("[engine-event]", event, payload);
      handlerRef.current(payload);
    });
    return () => { channel.off(event, ref); };
  }, [channel, event]);
}

function useAgentEvent(
  channel: Channel | null,
  emit: ReturnType<typeof useEventBus>["emit"],
  channelEvent: string,
  category: string,
  format: Formatter,
) {
  const formatRef = useRef(format);
  formatRef.current = format;
  const emitRef = useRef(emit);
  emitRef.current = emit;
  useEffect(() => {
    if (!channel) return;
    const ref = channel.on(channelEvent, (payload: AgentPayload) => {
      console.debug("[engine-event]", channelEvent, payload);
      const { message, severity } = formatRef.current(payload);
      emitRef.current({
        category,
        event: payload.event || channelEvent,
        message,
        severity,
        data: payload.data,
      });
    });
    return () => { channel.off(channelEvent, ref); };
  }, [channel, channelEvent, category]);
}

function stripPrefix(event?: string): string {
  return (event || "").replace("hook/", "");
}

function snakeToWords(s: string): string {
  return s.replace(/_/g, " ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
