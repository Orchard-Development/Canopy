import type { Channel } from "phoenix";
import { useEventBus, type EventSeverity, type EventActionMeta } from "./useEventBus";
import { humanizeTool, humanizeDuration } from "../components/notificationBellHelpers";
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
        message: `Agent session ended unexpectedly${payload.label && payload.label !== "unknown" ? `: ${payload.label}` : ""}`,
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
    if (status === "resolving") {
      emit({
        category: "autopull",
        event: "resolving",
        message: `Resolving pull conflicts: ${data.project || ""} (agent session started)`,
        severity: "warning",
        data,
      });
    } else if (status === "failed") {
      emit({
        category: "autopull",
        event: "error",
        message: `Failed to pull latest changes${data.project ? `: ${data.project}` : ""}`,
        severity: "error",
        data,
      });
    }
  });

  useChannelSub(channel, EVENTS.autoPush.status, (payload: Record<string, unknown>) => {
    const data = (payload.data || payload) as Record<string, unknown>;
    const status = data.status as string;
    if (status === "resolving_conflicts") {
      emit({
        category: "autopush",
        event: "resolving",
        message: `Resolving conflicts: ${data.project || ""} (agent session started)`,
        severity: "warning",
        data,
      });
    } else if (status === "build_failed" || status === "rebase_failed" || status === "push_failed") {
      const pushMessages: Record<string, string> = {
        build_failed: "Build failed before push",
        rebase_failed: "Merge conflict blocked push",
        push_failed: "Push to remote failed",
      };
      const msg = pushMessages[status] || `Auto-push ${status.replace("_", " ")}`;
      const project = data.project ? `: ${data.project}` : "";
      const reason = data.reason ? ` -- ${(data.reason as string).slice(0, 100)}` : "";
      emit({
        category: "autopush",
        event: "error",
        message: `${msg}${project}${reason}`,
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
      message: `Agent waiting for input${idleSec ? ` (idle ${humanizeDuration(idleSec)})` : ""}`,
      severity: "warning",
      data: payload,
      actionMeta: { type: "focus-session", sessionId: id, label },
    });
  });

  // analysis:complete suppressed — background indexing, not user-actionable.

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

  // Tool events: only failures reach the bell. Successful tool use is telemetry, not a notification.
  useChannelSub(channel, EVENTS.agent.tool, (payload: Record<string, unknown>) => {
    const p = payload as AgentPayload;
    const action = stripPrefix(p.event);
    if (action === "post_tool_use_failure") {
      const tool = p.tool_name || (p.data?.tool_name as string) || "unknown";
      emit({ category: "tool", event: "post_tool_use_failure", message: `Failed to ${humanizeTool(tool)}`, severity: "error", data: p.data });
    }
    // pre_tool_use and post_tool_use (success) are suppressed — not user-actionable
  });

  useAgentEvent(channel, emit, EVENTS.agent.subagent, "subagent", (p) => {
    const action = stripPrefix(p.event);
    const desc = (p.data?.description as string) || (p.data?.subagent_type as string) || "";
    if (action === "subagent_start") {
      return { message: `Sub-task started${desc ? `: ${desc}` : ""}`, severity: "info" };
    }
    return { message: `Sub-task finished${desc ? `: ${desc}` : ""}`, severity: "info" };
  });

  // Context compaction suppressed — internal optimization, not user-actionable.

  // Prompts suppressed from bell — the user already knows what they typed.
  // Kept as a channel subscription in case other consumers need it in the future.

  useAgentEvent(channel, emit, EVENTS.agent.permission, "permission", (p) => {
    const tool = p.tool_name || (p.data?.tool_name as string) || "unknown";
    const label = humanizeTool(tool);
    const msg = tool === "AskUserQuestion"
      ? "Agent needs your input"
      : `Agent needs permission to ${label}`;
    return { message: msg, severity: "warning" };
  });

  // Generic agent notifications suppressed — low signal, often internal plumbing.

  useAgentEvent(channel, emit, EVENTS.agent.task, "task", (p) => {
    const desc = (p.data?.task_description as string) || (p.data?.task_name as string) || "";
    const truncated = desc.length > 80 ? `${desc.slice(0, 80)}...` : desc;
    return { message: truncated ? `Task completed: ${truncated}` : "Task completed", severity: "success" };
  });

  // Skill candidates/improvements suppressed from bell — available in Intelligence tab.

  // -- Scheduled task events --------------------------------------------------

  useChannelSub(channel, "scheduled_task:failed", (payload: Record<string, unknown>) => {
    const title = (payload.title as string) || "unknown";
    emit({ category: "engine", event: "scheduled_task:failed", message: `Scheduled task failed: ${title}`, severity: "error", data: payload });
  });

  // scheduled_task:executed (success) suppressed — only failures need attention.

  // -- Mesh events ------------------------------------------------------------

  useChannelSub(channel, EVENTS.mesh.nodeDown, (payload: Record<string, unknown>) => {
    const node = (payload.node as string) || (payload.name as string) || "unknown";
    emit({ category: "engine", event: "mesh:node_down", message: `Mesh node disconnected: ${node}`, severity: "error", data: payload });
  });
}
