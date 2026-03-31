import type { Channel } from "phoenix";
import { useEventBus, type EventSeverity, type EventActionMeta } from "./useEventBus";
import { EVENTS } from "../lib/events";
import { useChannelSub, useAgentEvent, stripPrefix, snakeToWords, type AgentPayload } from "./engineEventHelpers";

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

  useChannelSub(channel, EVENTS.session.needsAttention, (payload: Record<string, unknown>) => {
    const id = payload.id as string;
    const label = (payload.label as string) || "Terminal";
    const reason = (payload.reason as string) || "Needs attention";
    const idleSec = (payload.idle_seconds as number) || 0;
    emit({
      category: "session",
      event: "session:needs_attention",
      message: `'${label}' needs attention -- ${reason} (idle ${idleSec}s)`,
      severity: "warning",
      data: payload,
      actionMeta: { type: "focus-session", sessionId: id, label },
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

  useChannelSub(channel, EVENTS.agent.tool, (payload: Record<string, unknown>) => {
    const p = payload as AgentPayload;
    const action = stripPrefix(p.event);
    // Filter out pre_tool_use ("Using X") noise — only show completions/failures
    if (action === "pre_tool_use") return;
    const tool = p.tool_name || (p.data?.tool_name as string) || "unknown";
    if (action === "post_tool_use_failure") {
      emit({ category: "tool", event: p.event || "post_tool_use_failure", message: `${tool} failed`, severity: "error", data: p.data });
    } else {
      emit({ category: "tool", event: p.event || "post_tool_use", message: tool, severity: "success", data: p.data });
    }
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

  useAgentEvent(channel, emit, EVENTS.agent.notification, "notification", (p) => {
    const body = (p.data?.body as string) || (p.data?.title as string) || "Notification";
    return { message: body, severity: "info" };
  });

  useAgentEvent(channel, emit, EVENTS.agent.task, "task", (p) => {
    const desc = (p.data?.task_description as string) || (p.data?.task_name as string) || "";
    const truncated = desc.length > 80 ? `${desc.slice(0, 80)}...` : desc;
    return { message: truncated ? `Task done: ${truncated}` : "Task completed", severity: "success" };
  });

  useChannelSub(channel, EVENTS.skill.candidate, (payload: Record<string, unknown>) => {
    const name = (payload.name as string) || "skill";
    emit({
      category: "skill",
      event: "candidate",
      message: `New skill candidate: ${name}`,
      severity: "info",
      data: payload,
    });
  });

  useChannelSub(channel, EVENTS.skill.improvement, (payload: Record<string, unknown>) => {
    const name = (payload.skill_name as string) || "skill";
    emit({
      category: "skill",
      event: "improvement",
      message: `Skill improvement suggested: ${name}`,
      severity: "info",
      data: payload,
    });
  });

  // -- Scheduled task events --------------------------------------------------

  useChannelSub(channel, "scheduled_task:failed", (payload: Record<string, unknown>) => {
    const title = (payload.title as string) || "unknown";
    emit({ category: "engine", event: "scheduled_task:failed", message: `Scheduled task failed: ${title}`, severity: "error", data: payload });
  });

  useChannelSub(channel, "scheduled_task:executed", (payload: Record<string, unknown>) => {
    const title = (payload.title as string) || "unknown";
    emit({ category: "engine", event: "scheduled_task:executed", message: `Task ran: ${title}`, severity: "success", data: payload });
  });

  // -- Mesh events ------------------------------------------------------------

  useChannelSub(channel, EVENTS.mesh.nodeDown, (payload: Record<string, unknown>) => {
    const node = (payload.node as string) || (payload.name as string) || "unknown";
    emit({ category: "engine", event: "mesh:node_down", message: `Mesh node disconnected: ${node}`, severity: "error", data: payload });
  });
}
