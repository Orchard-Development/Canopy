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
    needsAttention: "session:needs_attention",
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
    usage: "usage",
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
    /** Catch-all for non-hook agent events (e.g. from Python emitter). */
    event: "agent:event",
  },
  tunnel: {
    status: "tunnel:status",
    connectionCreated: "tunnel:connection_created",
    connectionResolved: "tunnel:connection_resolved",
    accessRequested: "tunnel:access_requested",
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
  roots: {
    matches: "roots:matches",
  },
  auth: {
    signout: "auth:signout",
  },
  toast: {
    show: "toast:show",
  },
  userActivity: "user:activity",
  feed: "feed:event",
  judgment: {
    scored: "judgment:scored",
    negative: "judgment:negative",
    report: "judgment:report",
  },
  swarm: {
    missionStarted: "swarm:mission_started",
    missionCompleted: "swarm:mission_completed",
    droneSpawned: "swarm:drone_spawned",
    droneDied: "swarm:drone_died",
    droneExited: "swarm:drone_exited",
    waggleDance: "swarm:waggle_dance",
  },
  openclaw: {
    started: "openclaw:started",
    stopped: "openclaw:stopped",
    health: "openclaw:health",
    messageInbound: "openclaw:message:inbound",
    messageOutbound: "openclaw:message:outbound",
    loginOutput: "openclaw:login:output",
    loginDone: "openclaw:login:done",
  },
  views: "views:changed",
  skill: {
    candidate: "skill:candidate",
    improvement: "skill:improvement",
  },
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
