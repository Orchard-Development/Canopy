/**
 * Channel event name constants.
 *
 * All events are broadcast
 * on the "dashboard" Phoenix channel. Per-session/per-entity events
 * include the ID in the payload, not in the event name.
 */

export const EVENTS = {
  status: "status:updated",
  tasks: {
    status: "tasks:status",
    progress: "tasks:progress",
    complete: "tasks:complete",
  },
  analysis: {
    started: "analysis:started",
    complete: "analysis:complete",
    error: "analysis:error",
  },
  workspace: {
    sync: "workspace:sync",
    adapted: "workspace:adapted",
    changed: "workspace:changed",
  },
  session: {
    output: "session:output",
    started: "session:started",
    exited: "session:exited",
    label: "session:label",
    summary: "session:summary",
    state: "session:state",
    spawn: "session:spawn",
    input: "session:input",
    kill: "session:kill",
    poker: "session:poker",
    pokerFired: "session:poker_fired",
    prettier: "session:prettier",
    open: "terminal:open",
  },
  sessions: "sessions:updated",
  mcp: {
    reload: "mcp:reload",
    status: "mcp:status",
  },
  autoCommit: {
    status: "autocommit:status",
  },
  autoPull: {
    status: "autopull:status",
  },
  autoPush: {
    status: "autopush:status",
  },
  preview: {
    opened: "preview:opened",
  },
  proposals: {
    dispatched: "proposal:dispatched",
    created: "proposal:created",
    changed: "proposal:changed",
    eval: "proposal:eval",
    evalDone: "proposal:eval_done",
  },
  action: {
    request: "action:request",
    created: "action:created",
    completed: "action:completed",
  },
  localAi: {
    status: "local_ai:status",
    prompt: "local_ai:prompt",
    reply: "local_ai:reply",
  },
  ai: {
    status: "ai:status",
  },
  chat: {
    token: "token",
    toolStart: "tool_start",
    toolExecuting: "tool_executing",
    toolResult: "tool_result",
    iteration: "iteration",
    done: "done",
    error: "error",
    state: "state",
  },
  agent: {
    output: "agent:output",
    lifecycle: "agent:lifecycle",
    tool: "agent:tool",
    subagent: "agent:subagent",
    compact: "agent:compact",
    prompt: "agent:prompt",
    permission: "agent:permission",
    config: "agent:config",
    worktree: "agent:worktree",
    elicitation: "agent:elicitation",
    notification: "agent:notification",
    task: "agent:task",
    hook: "agent:hook",
  },
  tunnel: {
    status: "tunnel:status",
    connectionCreated: "tunnel:connection_created",
    connectionResolved: "tunnel:connection_resolved",
  },
  profiler: {
    status: "profiler:status",
    activity: "profiler:activity",
  },
  mesh: {
    nodeUp: "mesh:node_up",
    nodeDown: "mesh:node_down",
    pendingApproval: "mesh:pending_approval",
    tunnelConnected: "mesh:tunnel_connected",
    remotePeerAdded: "mesh:remote_peer_added",
    remotePeerRemoved: "mesh:remote_peer_removed",
  },
  project: {
    created: "project:created",
  },
  toast: {
    show: "toast:show",
  },
  feed: "feed:event",
  views: "views:changed",
  autoresearch: {
    experimentStarted: "autoresearch:experiment_started",
    modified: "autoresearch:modified",
    evaluating: "autoresearch:evaluating",
    scored: "autoresearch:scored",
    decided: "autoresearch:decided",
    deferred: "autoresearch:deferred",
    error: "autoresearch:error",
    sessionProgress: "autoresearch:session_progress",
  },
};
