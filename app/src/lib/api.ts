// When served through the CF Pages proxy (/connect/<machineId>/...) all API
// calls must go through the proxy too, otherwise they hit the Site origin.
const _proxyMatch = window.location.pathname.match(/^\/connect\/([^/]+)\//);
const BASE = _proxyMatch ? `/connect/${_proxyMatch[1]}` : "";

/** The proxy path prefix (e.g. "/connect/my-machine") or "" for direct access. */
export const PROXY_BASE = BASE;

/** Remote orchard context -- when set, API calls go to the remote Phoenix. */
let _remoteBase: string | null = null;
let _remoteToken: string | null = null;
let _remoteVersion = 0;
const _remoteListeners = new Set<() => void>();

export function setRemoteOrchard(httpUrl: string | null, token: string | null) {
  _remoteBase = httpUrl;
  _remoteToken = token;
  _remoteVersion++;
  _remoteListeners.forEach((fn) => fn());
}

export function getRemoteOrchard(): { httpUrl: string | null; token: string | null } {
  return { httpUrl: _remoteBase, token: _remoteToken };
}

/** Returns a version number that increments on every setRemoteOrchard call. */
export function getRemoteVersion(): number {
  return _remoteVersion;
}

/** Subscribe to remote orchard changes. Returns unsubscribe function. */
export function onRemoteOrchardChange(fn: () => void): () => void {
  _remoteListeners.add(fn);
  return () => _remoteListeners.delete(fn);
}

function resolveUrl(path: string): string {
  if (_remoteBase) return `${_remoteBase}${path}`;
  return `${BASE}${path}`;
}

function authHeaders(): Record<string, string> {
  if (_remoteToken) return { Authorization: `Bearer ${_remoteToken}` };
  return {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(resolveUrl(path), { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function postFormData<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export interface SessionRecord {
  chatId: string;
  title: string;
  summary: string;
  verdict: string;
  firstQuery: string;
  date: string;
  timestamp: string;
  fileBytes: number;
  userTurns: number;
  assistantTurns: number;
  totalCalls: number;
  tools: Record<string, number>;
  skills: string[];
  skillCounts: Record<string, number>;
  subagentTypes: Record<string, number>;
  planMode: boolean;
  thinkingBlocks: number;
  responseCharsTotal: number;
  responseCharsAvg: number;
  responseCharsMax: number;
}

export interface SessionsPage {
  records: SessionRecord[];
  page: number;
  totalPages: number;
  total: number;
}

export interface StatsOverview {
  totalSessions: number;
  analyzedSessions: number;
  productiveRate: number;
  avgEfficiency: number;
  currentStreak: number;
  bestStreak: number;
  totalToolCalls: number;
  uniqueSkills: number;
  avgTurns: number;
  activityMap: Record<string, number>;
  trends: {
    productiveRate: { direction: string; delta: number };
    efficiency: { direction: string; delta: number };
    toolCalls: { direction: string; delta: number };
  };
}

export interface IdentityProvider {
  provider: "github" | "cursor" | "aws";
  status: "connected" | "disconnected" | "unknown";
  username?: string;
  displayName?: string;
  email?: string;
  detail?: string;
}

export interface IdentitySnapshot {
  github: IdentityProvider;
  cursor: IdentityProvider;
  aws: IdentityProvider;
  updatedAt: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface UpdateStatus {
  branch: string;
  sha: string;
  commitMessage?: string;
  history?: CommitInfo[];
  ahead: number;
  behind: number;
  dirty: boolean;
  stashConflict?: boolean;
  state: "current" | "behind" | "ahead" | "diverged" | "error" | "unknown";
  lastCheckedAt: string;
  autoUpdated: boolean;
  previousSha?: string;
  error?: string;
}

export interface ViewGenerateRequest {
  name: string;
  description: string;
}

export interface ViewEntry {
  name: string;
  path: string;
  label: string;
  icon: string;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(resolveUrl(path), { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export interface OrchardViewRecord {
  id: string;
  orchard_id: string;
  slug: string;
  label: string;
  icon: string;
  source: string;
  source_id: string | null;
  route_path: string;
  component: string;
  position: number;
  visible: number;
  removable: number;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface ResolvedMcpServer {
  id: string;
  name: string;
  namespace: string;
  version: string;
  command: string;
  args: string;
  env: string;
  enabled: number;
  targets: string;
  config_schema: string;
  repo_url: string | null;
  stars: number;
  avatar_url: string | null;
  inherited: boolean;
  project_enabled: boolean;
  resolved_env: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  root_path: string;
  status: string;
  config: Record<string, unknown> & { theme?: Record<string, unknown> };
  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: string;
  project_id: string;
  type: string;
  title: string;
  summary: string;
  diff: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface FeedEvent {
  id: string;
  project_id: string;
  type: string;
  title: string;
  detail: string;
  created_at: string;
}

export interface IntelItem {
  name: string;
  description: string;
  content: string;
}

export interface LaunchResult {
  method: "opened" | "session";
  label: string;
  sessionId?: string;
}

export interface IdeInfo {
  name: string;
}

export interface ProjectFileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  isSymlink?: boolean;
  realPath?: string | null;
  cycleDetected?: boolean;
}

export interface ProjectBrowseResult {
  current: string;
  root: string;
  relative: string;
  parent: string | null;
  entries: ProjectFileEntry[];
  exists: boolean;
}

export interface FileReadResult {
  path: string;
  name: string;
  size: number;
  binary: boolean;
  truncated?: boolean;
  content: string | null;
}

export interface SearchResult {
  file: string;
  line: string;
  content: string;
}

export interface SearchResponse {
  matches: SearchResult[];
  count: number;
  pattern: string;
  path: string;
}

export interface SessionMapNode {
  id: string;
  title: string;
  date: string;
  verdict: string;
  skills: string[];
  theme: string;
  totalCalls: number;
  userTurns: number;
  repos: string[];
}

export interface SessionMapEdge {
  source: string;
  target: string;
  weight: number;
  sharedSkills: string[];
}

export interface SessionMapData {
  nodes: SessionMapNode[];
  edges: SessionMapEdge[];
}

export interface SkillNode {
  id: string;
  description: string;
  category: string;
  relatedSkills: string[];
}

export interface SkillEdge {
  source: string;
  target: string;
  type: "trigger" | "related";
}

export interface SkillGraph {
  nodes: SkillNode[];
  edges: SkillEdge[];
}

export type AgentJobType =
  | "profile-scan"
  | "session-analysis"
  | "memory-synthesis"
  | "agent-synthesis"
  | "skill-evolution"
  | "knowledge-index"
  | "codebase-scan"
  | "analyze"
  | "learn"
  | "maintain"
  | "monitor";

export interface AgentJob {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled" | "idle" | "done" | "error";
  trigger: "periodic" | "manual";
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  detail?: string;
  logTail: string[];
  exitCode?: number;
  lastRun?: string;
  error?: string;
}

export interface AgentSchedulerState {
  running: boolean;
  jobs: AgentJob[];
  lastCheckedAt: string;
  nextRunAt: string;
  intervalMs: number;
  lastFingerprint?: string;
  fingerprintSources?: {
    transcripts: string;
    repos: string;
    memory: string;
  };
  lastRun?: string;
  nextRun?: string;
}

export interface SessionAnalysis {
  themes: string[];
  efficiency: number;
  notes: string;
}

// -- Orchard / Research types -----------------------------------------------

export interface OrchardSession {
  id: string;
  source_type: string;
  source_path: string;
  user_id?: string;
  x: number;
  y: number;
  z: number;
  cluster: number;
  date: string;
  label: string;
  tools: Record<string, number>;
  skills: string[];
  total_tool_calls: number;
}

export interface RootsUser {
  user_id: string;
  embedding_count: number;
  display_name?: string;
  machines?: string[];
}

export interface SeedGrowthPoint {
  week: string;
  count: number;
}

export interface OrchardSeed {
  name: string;
  type: "skill" | "rule" | "template";
  path: string;
  created_at: string | null;
  usage_count: number;
  centroid: { x: number; y: number; z: number } | null;
  growth: SeedGrowthPoint[];
}

export interface OrchardConnection {
  session_id: string;
  seed_name: string;
}

export interface OrchardStats {
  session_count: number;
  seed_count: number;
  connection_count: number;
  reuse_rate: number;
}

export interface OrchardData {
  sessions: OrchardSession[];
  seeds: OrchardSeed[];
  connections: OrchardConnection[];
  stats: OrchardStats;
  indexing?: boolean;
}

export interface SimilarResult {
  id: string;
  distance: number;
  date?: string;
  label?: string;
}

export interface ProfileStatus {
  profiling: boolean;
  last_profiled_at: string | null;
  next_reprofile_in_ms: number;
  reprofile_interval_ms: number;
}

export interface ResearchStats {
  rows: number;
  [key: string]: unknown;
}

export interface MeshStatus {
  node_name: string;
  node?: string;
  local_sessions: number;
  connected_nodes: Array<{ name: string; display_name?: string; machine_name?: string; session_count: number; token?: string; http_url?: string; role?: string; type?: string }>;
  peers: MeshNode[];
  mesh_active: boolean;
  wg_public_key?: string | null;
  wg_listen_port?: number | null;
}

export interface TunnelStatus {
  status: "ready" | "starting" | "disabled" | "crashed";
  public_key: string | null;
  listen_port: number | null;
  peers: string[];
}

export interface MeshNode {
  name: string;
  display_name?: string;
  machine_name?: string;
  sessions: number;
  role?: "admin" | "operator" | "viewer";
  type?: "local" | "beam" | "remote";
}

export interface MeshSession {
  id: string;
  command: string;
  cwd: string;
  started_at: string;
  state: string;
  label?: string;
  summary?: string;
  exit_code?: number;
  agent_type?: string;
  project_id?: string;
  node?: string;
}

export const api = {
  sessions: (page = 0, pageSize = 25, projectId?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (projectId) params.set("projectId", projectId);
    return get<SessionsPage>(`/api/sessions?${params}`);
  },

  stats: (projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    return get<StatsOverview>(`/api/stats${qs}`);
  },

  identities: () => get<IdentitySnapshot>("/api/identities"),

  updates: () => get<UpdateStatus>("/api/updates"),

  viewsList: () => get<ViewEntry[]>("/api/views"),

  generateView: (req: ViewGenerateRequest) =>
    postJson<ViewEntry>("/api/views/generate", req),

  modifyView: (name: string, instruction: string) =>
    postJson<{ ok: boolean }>("/api/views/modify", { name, instruction }),

  viewSource: (name: string) =>
    get<{ source: string }>(`/api/views/${encodeURIComponent(name)}/source`),

  // Orchard Views
  listOrchardViews: (orchardId: string) =>
    get<OrchardViewRecord[]>(`/api/orchards/${orchardId}/views`),

  createOrchardView: (orchardId: string, body: {
    slug: string;
    label: string;
    icon?: string;
    source?: string;
    sourceId?: string;
    routePath: string;
    component: string;
    position?: number;
  }) => postJson<OrchardViewRecord>(`/api/orchards/${orchardId}/views`, body),

  updateOrchardView: (orchardId: string, viewId: string, body: {
    label?: string;
    icon?: string;
    position?: number;
    visible?: number;
  }) => putJson<OrchardViewRecord>(`/api/orchards/${orchardId}/views/${viewId}`, body),

  deleteOrchardView: (orchardId: string, viewId: string) =>
    del<{ ok: boolean }>(`/api/orchards/${orchardId}/views/${viewId}`),

  seedOrchardViews: (orchardId: string) =>
    postJson<OrchardViewRecord[]>(`/api/orchards/${orchardId}/views/seed`, {}),

  // Projects
  listProjects: () => get<ProjectRecord[]>("/api/projects"),

  getProject: (id: string) => get<ProjectRecord>(`/api/projects/${id}`),

  createProject: (body: {
    name: string;
    description?: string;
    rootPath: string;
    projectType?: string;
    goals?: string[];
    repos?: Array<{ name: string; url?: string; path?: string }>;
    config?: Record<string, unknown>;
  }) => postJson<ProjectRecord>("/api/projects", body),

  importProject: (rootPath: string, name?: string) =>
    postJson<ProjectRecord>("/api/projects/import", { rootPath, name }),

  updateProject: (id: string, body: Record<string, unknown>) =>
    patchJson<ProjectRecord>(`/api/projects/${id}`, body),

  deleteProject: (id: string) => del<{ ok: boolean }>(`/api/projects/${id}`),

  deleteProjectWithData: (id: string) =>
    del<{ deleted: boolean; data_removed: boolean }>(`/api/projects/${id}/purge`),

  seedProject: (id: string, slugs?: string[]) =>
    postJson<{ ok: boolean; results: Record<string, { applied: number; updated: number; current: number; skipped: number; drifted: number }> }>(
      `/api/projects/${id}/seed`, slugs ? { slugs } : {},
    ),

  aiRefreshProject: (id: string) =>
    postJson<{ ok: boolean; project: ProjectRecord; changes: Record<string, unknown> }>(
      `/api/projects/${id}/ai-refresh`, {},
    ),

  generateProjectTheme: (id: string, description?: string) =>
    postJson<{ ok: boolean; theme: Record<string, unknown>; project: ProjectRecord }>(
      `/api/projects/${id}/generate-theme`, { description },
    ),

  themeFromUrl: (id: string, url: string) =>
    postJson<{ ok: boolean; theme: Record<string, unknown>; project: ProjectRecord }>(
      `/api/projects/${id}/theme-from-url`, { url },
    ),

  previewThemeFromUrl: (url: string) =>
    postJson<{ ok: boolean; theme: Record<string, unknown> }>(
      `/api/preview-theme-from-url`, { url },
    ),

  projectFromUrl: (url: string) =>
    postJson<{ ok: boolean; data: {
      name: string;
      description: string;
      projectType: string;
      theme: Record<string, unknown>;
      branding?: {
        websiteUrl?: string;
        logoUrl?: string;
        faviconUrl?: string;
        ogImage?: string;
      };
    } }>(
      `/api/project-from-url`, { url },
    ),

  getSeedStatus: (id: string) =>
    get<{ packs: Record<string, { version: number; appliedAt: string; files: Record<string, { status: string }> }> }>(
      `/api/projects/${id}/seed-status`,
    ),

  getHarvestable: (projectId: string) =>
    get<{ rules: Array<{ path: string; name: string; size: number }>; skills: Array<{ path: string; name: string; fileCount: number }>; templates: Array<{ path: string; name: string; fileCount: number }> }>(
      `/api/projects/${projectId}/harvestable`,
    ),

  listSeedPacks: () =>
    get<Array<{ id: string; name: string; slug: string; description: string; source_project_id: string | null; fileCount: number; version: number; source: "public" | "user"; created_at: string; updated_at: string; category?: string; tags?: string[]; requires?: string[]; techStack?: string[] }>>(
      "/api/seed-packs",
    ),

  getSeedPack: (id: string) =>
    get<{ id: string; name: string; slug: string; description: string; source: string; files: Array<{ path: string; content?: string; sha256: string; storage_key?: string }>; version: number; created_at: string; updated_at: string; category?: string; tags?: string[]; requires?: string[]; techStack?: string[] }>(
      `/api/seed-packs/${id}`,
    ),

  fetchFileContent: (id: string, path: string) =>
    get<{ content: string; sha256: string; path: string }>(
      `/api/seed-packs/${id}/file-content?path=${encodeURIComponent(path)}`,
    ),

  generateSeedPack: (body: { prompt: string }) =>
    postJson<{ id: string; name: string; slug: string; description: string; fileCount: number; model: string }>(
      "/api/seed-packs/generate", body,
    ),

  createSeedPack: (body: { name: string; description?: string; files?: Array<{ path: string; content: string }> }) =>
    postJson<{ id: string; name: string; slug: string; description: string; source: string; files: Array<{ path: string; content?: string; sha256: string; storage_key?: string }>; version: number; created_at: string; updated_at: string }>(
      "/api/seed-packs", body,
    ),

  updateSeedPack: (id: string, body: { name?: string; description?: string; files?: Array<{ path: string; content: string }> }) =>
    patchJson<{ id: string; name: string; slug: string; description: string; source: string; files?: Array<{ path: string; content?: string; sha256: string; storage_key?: string }>; version: number; created_at: string; updated_at: string }>(
      `/api/seed-packs/${id}`, body,
    ),

  upsertSeedPackFile: (id: string, body: { path: string; content: string }) =>
    putJson<{ ok: boolean; file: { path: string; content?: string; sha256: string; storage_key?: string } }>(
      `/api/seed-packs/${id}/files`, body,
    ),

  removeSeedPackFile: (id: string, path: string) =>
    postJson<{ ok: boolean }>(
      `/api/seed-packs/${id}/files/remove`, { path },
    ),

  rewriteSeedPackFile: (id: string, body: { path: string; instruction: string }) =>
    postJson<{ ok: boolean; file: { path: string; content?: string; sha256: string; storage_key?: string }; model: string }>(
      `/api/seed-packs/${id}/files/rewrite`, body,
    ),

  generateSeedPackFile: (id: string, body: { type: string; name: string; description?: string }) =>
    postJson<{ ok: boolean; path: string; content: string; model: string }>(
      `/api/seed-packs/${id}/files/generate`, body,
    ),

  harvestSeedPack: (body: { name: string; description?: string; projectId: string; paths: string[] }) =>
    postJson<{ id: string; name: string; slug: string; fileCount: number; version: number }>(
      "/api/seed-packs/harvest", body,
    ),

  plantSeedPack: (projectId: string, packId: string) =>
    postJson<{ ok: boolean; result: { applied: number; updated: number; current: number; skipped: number; drifted: number } }>(
      `/api/projects/${projectId}/plant`, { packId },
    ),

  deleteSeedPack: (id: string) =>
    del<{ ok: boolean }>(`/api/seed-packs/${id}`),

  harvestAi: (projectId: string, opts?: { mode?: "terminal" | "quick"; name?: string; description?: string }) =>
    postJson<{ id?: string; sessionId?: string; name?: string; slug?: string; fileCount?: number; mode: string }>(
      `/api/projects/${projectId}/harvest-ai`, opts ?? {},
    ),

  harvestGithub: (body: { url: string; name?: string; description?: string }) =>
    postJson<{ id: string; name: string; slug: string; fileCount: number; scannedFiles: number; source: string }>(
      "/api/seed-packs/harvest-github", body,
    ),


  // Project MCP servers
  projectMcpServers: (projectId: string) =>
    get<ResolvedMcpServer[]>(`/api/projects/${projectId}/mcp`),

  addProjectMcpServer: (projectId: string, body: Record<string, unknown>) =>
    postJson<{ ok: boolean; servers: ResolvedMcpServer[]; written: string[] }>(
      `/api/projects/${projectId}/mcp`, body,
    ),

  updateProjectMcpServer: (
    projectId: string,
    serverId: string,
    body: { enabled?: boolean; env?: Record<string, string> },
  ) =>
    patchJson<{ ok: boolean; servers: ResolvedMcpServer[]; written: string[] }>(
      `/api/projects/${projectId}/mcp/${encodeURIComponent(serverId)}`, body,
    ),

  removeProjectMcpServer: (projectId: string, serverId: string) =>
    del<{ ok: boolean; servers: ResolvedMcpServer[]; written: string[] }>(
      `/api/projects/${projectId}/mcp/${encodeURIComponent(serverId)}`,
    ),

  syncProjectMcp: (projectId: string) =>
    postJson<{ ok: boolean; written: string[] }>(
      `/api/projects/${projectId}/mcp/sync`, {},
    ),

  // Approvals
  listApprovals: (projectId: string, status = "pending") =>
    get<ApprovalRecord[]>(`/api/projects/${projectId}/approvals?status=${status}`),

  approveApproval: (projectId: string, approvalId: string) =>
    postJson<{ ok: boolean }>(`/api/projects/${projectId}/approvals/${approvalId}/approve`, {}),

  rejectApproval: (projectId: string, approvalId: string) =>
    postJson<{ ok: boolean }>(`/api/projects/${projectId}/approvals/${approvalId}/reject`, {}),

  // Feed
  listFeed: (projectId: string, opts?: { type?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.type) params.set("type", opts.type);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return get<FeedEvent[]>(`/api/projects/${projectId}/feed${qs ? `?${qs}` : ""}`);
  },

  // Intelligence
  listRules: (projectId: string) => get<IntelItem[]>(`/api/projects/${projectId}/rules`),
  listSkills: (projectId: string) => get<IntelItem[]>(`/api/projects/${projectId}/skills`),
  listMemory: (projectId: string, category?: string) => {
    const qs = category ? `?category=${category}` : "";
    return get<IntelItem[]>(`/api/projects/${projectId}/memory${qs}`);
  },
  createRule: (projectId: string, name: string, content: string) =>
    postJson<{ ok: boolean; name: string }>(`/api/projects/${projectId}/rules`, { name, content }),
  updateRule: (projectId: string, name: string, content: string) =>
    patchJson<{ ok: boolean }>(`/api/projects/${projectId}/rules/${name}`, { content }),
  deleteRule: (projectId: string, name: string) =>
    del<{ ok: boolean }>(`/api/projects/${projectId}/rules/${name}`),
  createSkill: (projectId: string, name: string, content: string) =>
    postJson<{ ok: boolean; name: string }>(`/api/projects/${projectId}/skills`, { name, content }),
  updateSkill: (projectId: string, name: string, content: string) =>
    patchJson<{ ok: boolean }>(`/api/projects/${projectId}/skills/${name}`, { content }),
  deleteSkill: (projectId: string, name: string) =>
    del<{ ok: boolean }>(`/api/projects/${projectId}/skills/${name}`),
  createMemory: (projectId: string, category: string, name: string, content: string) =>
    postJson<{ ok: boolean; name: string }>(`/api/projects/${projectId}/memory`, { category, name, content }),
  deleteMemory: (projectId: string, name: string) =>
    del<{ ok: boolean }>(`/api/projects/${projectId}/memory/${name}`),

  // IDE
  listIdes: () => get<IdeInfo[]>("/api/ides"),
  launchIde: (projectId: string, ide: string) =>
    postJson<LaunchResult>(`/api/projects/${projectId}/launch`, { ide }),

  // Terminal
  spawnTerminal: (command?: string, args?: string[], cwd?: string, projectId?: string, initialInput?: string) =>
    postJson<{ id: string; command: string; cwd: string; startedAt: string; label?: string; state?: string; projectId?: string }>(
      "/api/terminal",
      { command, args, cwd, projectId, initialInput },
    ),

  spawnOrchardTerminal: (gatewayModel: string, cwd?: string, projectId?: string, command = "opencode") =>
    postJson<{ id: string; command: string; cwd: string; startedAt: string; label?: string; state?: string; projectId?: string }>(
      "/api/terminal",
      { command, args: [], cwd, projectId, gatewayModel },
    ),

  getGatewayModels: () =>
    get<{ models: Array<{ id: string; label: string; provider: string }>; default: string }>(
      "/api/gateway/models",
    ),

  listTerminals: () =>
    get<Array<{ id: string; command: string; cwd: string; startedAt: string; exitCode?: number; label?: string; summary?: string; state?: string; projectId?: string; forkedFrom?: string }>>(
      "/api/terminal",
    ),

  getTerminal: (id: string) =>
    get<{ id: string; command: string; cwd: string; startedAt: string; exitCode?: number; label?: string; summary?: string; state?: string; projectId?: string; agentType?: string; source?: string; forkedFrom?: string }>(
      `/api/terminal/${id}`,
    ),

  renameTerminal: (id: string, label: string) =>
    patchJson<{ ok: boolean; label: string }>(`/api/terminal/${id}/label`, { label }),

  setTerminalState: (id: string, state: string) =>
    patchJson<{ ok: boolean; state: string }>(`/api/terminal/${id}/state`, { state }),

  syncTerminalAi: (id: string) =>
    postJson<{ label?: string; summary?: string; error?: string }>(`/api/terminal/${id}/sync`, {}),

  getTerminalPrettier: (id: string) =>
    get<{ id: string; summaries: Array<{ turn: number; summary: string; at: string }> }>(
      `/api/terminal/${id}/prettier`,
    ),

  getTerminalHookLog: (id: string) =>
    get<{ id: string; entries: Array<{ id: number; event_type: string; tool_name?: string; content?: string; metadata?: string; created_at: string }>; last_prompt?: string }>(
      `/api/terminal/${id}/hook-log`,
    ),

  writeToSession: (id: string, data: string) =>
    postJson<{ ok: boolean }>(`/api/terminal/${id}/input`, { data }),

  killTerminal: (id: string) => del<{ killed: boolean }>(`/api/terminal/${id}`),

  purgeExitedTerminals: () =>
    postJson<{ purged: number }>("/api/terminal/purge", {}),

  detachTerminal: (id: string) =>
    postJson<{ ok: boolean }>(`/api/terminal/${id}/detach`, {}),

  setPoker: (id: string, enabled: boolean) =>
    patchJson<{ id: string; poker: boolean }>(`/api/terminal/${id}/poker`, { enabled }),

  getTerminalProfiles: () =>
    get<{ profiles: Record<string, unknown>; updated_at: string }>("/api/terminal/profiles"),

  // Terminal actions
  requestTerminalAction: (command: string, args: string[], title: string, description?: string, cwd?: string) =>
    postJson<{ id: string; sessionId: string }>("/api/terminal/action", { command, args, title, description, cwd }),

  listTerminalActions: () =>
    get<Array<{ id: string; sessionId: string; command: string; args?: string[]; title: string; description?: string; createdAt: string }>>(
      "/api/terminal/actions",
    ),

  completeTerminalAction: (id: string) =>
    patchJson<{ ok: boolean }>(`/api/terminal/action/${id}/complete`, {}),

  // Ollama
  ollamaStatus: () =>
    get<{ installed: boolean; running: boolean; version: string | null; models: Array<{ name: string; size: number }> }>(
      "/api/ollama/status",
    ),

  ollamaInstall: () => postJson<{ success: boolean; error?: string }>("/api/ollama/install", {}),

  ollamaPull: (model: string) => postJson<{ ok: boolean }>("/api/ollama/pull", { model }),

  ollamaTest: (model: string) =>
    postJson<{ ok: boolean; result?: string; latency?: number; error?: string }>(
      "/api/ollama/test",
      { model },
    ),

  // Local AI
  localAiPrompt: (prompt: string, opts?: {
    maxTokens?: number;
    temperature?: number;
    tools?: boolean;
    route?: "local" | "cloud" | "auto";
  }) =>
    postJson<{
      ok: boolean;
      response?: string;
      error?: string;
      backend?: string;
      toolCalls?: number;
      iterations?: number;
      reason?: string;
    }>("/api/local-ai/prompt", { prompt, ...opts }),

  localAiStatus: () =>
    get<{
      status: string;
      model: string | null;
      ollama: boolean;
      routingMode: string;
      hasCloudKey: boolean;
      tier: string | null;
      supportsTools: boolean;
    }>("/api/local-ai/status"),

  localAiModels: () =>
    get<{
      models: Array<{
        name: string;
        size: number;
        tier: string;
        supportsTools: boolean;
      }>;
      active: string | null;
    }>("/api/local-ai/models"),

  localAiSetModel: (model: string) =>
    fetch("/api/local-ai/model", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    }).then((r) => r.json() as Promise<{ ok: boolean; model: string }>),

  localAiPull: (model: string) =>
    postJson<{ ok: boolean; model: string }>("/api/local-ai/pull", { model }),

  localAiRouting: () =>
    get<{ mode: string; threshold: number; cloudProvider: string | null }>(
      "/api/local-ai/routing",
    ),

  localAiSetRouting: (opts: { mode?: string; threshold?: number }) =>
    fetch("/api/local-ai/routing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    }).then((r) => r.json() as Promise<{ ok: boolean }>),

  // Claude Code Readiness
  claudeReadiness: () =>
    get<{
      status: "ready" | "fixing" | "error" | "unchecked";
      installed: boolean;
      version: string | null;
      checks: Array<{ field: string; ok: boolean; detail: string }>;
      issues: string[];
      fixes: string[];
      lastCheck: string | null;
      lastProbe: string | null;
      probeOutput: string | null;
      probeVerdict: string | null;
    }>("/api/health/claude-readiness"),

  claudeReadinessProbe: () =>
    postJson<{
      status: "ready" | "fixing" | "error" | "unchecked";
      installed: boolean;
      version: string | null;
      checks: Array<{ field: string; ok: boolean; detail: string }>;
      issues: string[];
      fixes: string[];
      lastCheck: string | null;
      lastProbe: string | null;
      probeOutput: string | null;
      probeVerdict: string | null;
    }>("/api/health/claude-readiness/probe", {}),

  // CLI Tools
  cliToolsStatus: () =>
    get<{
      claude: { installed: boolean; version: string | null };
      codex: { installed: boolean; version: string | null };
      opencode: { installed: boolean; version: string | null };
      claw_code: { installed: boolean; version: string | null };
      cloudflared: { installed: boolean; version: string | null };
    }>("/api/cli-tools/status"),

  cliToolsInstall: (tool: "claude" | "codex" | "opencode" | "claw" | "cloudflared") =>
    postJson<{ success: boolean; error?: string; installed?: boolean; version?: string }>("/api/cli-tools/install", { tool }),

  reseedConfig: (projectId: string) =>
    postJson<{ ok: boolean; written?: number; removed?: number; error?: string }>(`/api/projects/${projectId}/reseed-config`, {}),

  // Session logs
  listSessionLogs: () =>
    get<SessionLogMeta[]>("/api/session-logs").then((logs) =>
      logs.map((s) => ({
        ...s,
        // External active sessions have null exitCode from JSON — coerce to undefined
        // Stale sessions with missing exitCode default to 0 (ended)
        exitCode: s.exitCode == null
          ? (s.source === "external" ? undefined : 0)
          : s.exitCode,
      }))
    ),

  getSessionLog: (id: string) =>
    get<{ entries: SessionLogEntry[] }>(`/api/session-logs/${id}`),

  deleteSessionLog: (id: string) => del<{ deleted: boolean }>(`/api/session-logs/${id}`),

  analyzeSessionLog: (id: string) =>
    postJson<SessionLogAnalysis>(`/api/session-logs/${id}/analyze`, {}),

  getResumeChain: (id: string) =>
    get<SessionLogMeta[]>(`/api/session-logs/${id}/resume-chain`),

  getSessionMessages: (id: string) =>
    get<Array<{ role: string; text: string; ts?: string }>>(`/api/session-logs/${id}/messages`),

  searchSessionLogs: (q: string) =>
    get<{ matches: Array<{ id: string; snippet: string }> }>(`/api/session-logs/search?q=${encodeURIComponent(q)}`),

  resumeSession: (id: string, fork = false) =>
    postJson<{ id: string; command: string; cwd: string; startedAt: string }>(
      "/api/terminal",
      { resumeSessionId: id, forkSession: fork },
    ),

  forkTerminal: (id: string) =>
    postJson<{ id: string; command: string; cwd: string; startedAt: string; forkedFrom: string }>(
      `/api/terminal/${id}/fork`, {},
    ),

  // Project filesystem
  projectBrowse: (root: string, browsePath?: string) => {
    const params = new URLSearchParams({ root });
    if (browsePath) params.set("path", browsePath);
    return get<ProjectBrowseResult>(`/api/fs/project-browse?${params}`);
  },

  browseDir: async (dirPath: string): Promise<ProjectFileEntry[]> => {
    const items = await get<{ name: string; type: string; size: number; isSymlink?: boolean; realPath?: string | null; cycleDetected?: boolean }[]>(
      `/api/fs/browse?path=${encodeURIComponent(dirPath)}`,
    );
    return items.map((item) => ({
      name: item.name,
      path: dirPath + "/" + item.name,
      isDir: item.type === "directory",
      size: item.size,
      isSymlink: item.isSymlink,
      realPath: item.realPath,
      cycleDetected: item.cycleDetected,
    }));
  },

  readFile: (filePath: string, root?: string) => {
    const params = new URLSearchParams({ path: filePath });
    if (root) params.set("root", root);
    return get<FileReadResult>(`/api/fs/read?${params}`);
  },

  writeFile: (filePath: string, content: string) =>
    postJson<{ ok: boolean }>("/api/fs/write", { path: filePath, content }),

  deleteFile: (filePath: string, force = false) => {
    const params = new URLSearchParams({ path: filePath });
    if (force) params.set("force", "true");
    return fetch(resolveUrl(`/api/fs/delete?${params}`), { method: "DELETE", headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<{ ok: boolean; path: string }>;
      });
  },

  renameFile: (source: string, destination: string) =>
    postJson<{ ok: boolean; source: string; destination: string }>("/api/fs/rename", { source, destination }),

  searchFiles: (root: string, pattern: string, opts?: { glob?: string; maxResults?: number }) => {
    const params = new URLSearchParams({ root, pattern });
    if (opts?.glob) params.set("glob", opts.glob);
    if (opts?.maxResults) params.set("max_results", String(opts.maxResults));
    return get<SearchResponse>(`/api/fs/search?${params}`);
  },

  readFileRaw: (filePath: string): string => {
    return `${resolveUrl("/api/fs/read")}?path=${encodeURIComponent(filePath)}&raw=true`;
  },

  mkdir: (dirPath: string) =>
    postJson<{ ok: boolean; path: string }>("/api/fs/mkdir", { path: dirPath }),

  skillGraph: (projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    return get<SkillGraph>(`/api/skills/graph${qs}`);
  },

  sessionMap: (projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    return get<SessionMapData>(`/api/sessions/map${qs}`);
  },

  // Orchard Research (Roots -- pgvector RAG)
  getOrchardData: (userId?: string) => {
    const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return get<OrchardData>(`/api/roots/graph${qs}`);
  },

  getRootsUsers: () =>
    get<{ users: RootsUser[] }>("/api/roots/users"),

  getSimilarSessions: (sessionId: string, k = 10) =>
    get<{ session_id: string; k: number; results: SimilarResult[] }>(
      `/api/research/similar/${encodeURIComponent(sessionId)}?k=${k}`,
    ),

  getResearchStats: () => get<ResearchStats>("/api/research/stats"),

  reprofile: () => postJson<{ status: string }>("/api/roots/index", {}),

  getProfileStatus: () => get<ProfileStatus>("/api/research/profile-status"),

  // Workspace Tools
  listWorkspaceTools: () => get<WorkspaceToolsResponse>("/api/workspace/tools"),

  // Proposals
  listProposals: (projectId?: string) => {
    if (projectId) return get<ProposalSummary[]>(`/api/projects/${projectId}/proposals`);
    return get<ProposalSummary[]>("/api/proposals");
  },

  createProposal: (description: string, memoryContext?: string, projectId?: string) =>
    postJson<{ sessionId: string }>("/api/proposals", { description, memoryContext, projectId }),

  getProposal: (slug: string, projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    return get<ProposalDetail>(`/api/proposals/${slug}${qs}`);
  },

  updateTaskStatus: (slug: string, taskNum: string, status: string, projectId?: string) =>
    patchJson<{ ok: boolean }>(`/api/proposals/${slug}/tasks/${taskNum}`, { status, projectId }),

  buildProposal: (slug: string, opts?: { task?: string; agent?: string; projectId?: string }) =>
    postJson<{ sessionId: string; slug: string; task: string | null; agent: string; promptPath: string }>(
      `/api/proposals/${slug}/build`,
      opts ?? {},
    ),

  editProposal: (slug: string, opts?: { task?: string; projectId?: string }) =>
    postJson<{ sessionId: string; slug: string; task: string | null; promptPath: string }>(
      `/api/proposals/${slug}/edit`,
      opts ?? {},
    ),

  deleteProposal: (slug: string, projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    return fetch(`/api/proposals/${slug}${qs}`, { method: "DELETE" }).then(async (r) => {
      if (!r.ok) throw new Error(`DELETE /api/proposals/${slug}: ${r.status}`);
      return r.json() as Promise<{ ok: boolean; slug: string }>;
    });
  },

  setProposalStatus: (slug: string, status: string, projectId?: string) =>
    patchJson<{ ok: boolean; slug: string; status: string }>(`/api/proposals/${slug}`, { status, projectId }),

  evaluateProposal: (slug: string, projectId?: string) =>
    postJson<{ slug: string; topic: string }>(`/api/proposals/${slug}/evaluate`, { projectId }),

  // Tunnel connections
  listTunnelConnections: () =>
    get<{ connections: TunnelConnection[] }>("/api/tunnel/connections"),

  approveTunnelConnection: (id: string) =>
    postJson<{ ok: boolean; id: string }>(`/api/tunnel/authorize/${id}`, {}),

  denyTunnelConnection: (id: string) =>
    del<{ ok: boolean; id: string }>(`/api/tunnel/authorize/${id}`),

  // Tunnel sessions
  listTunnelSessions: () =>
    get<{ sessions: TunnelSession[] }>("/api/tunnel/sessions"),

  revokeTunnelSession: (token: string) =>
    del<{ ok: boolean }>(`/api/tunnel/sessions/${token}`),

  // Tunnel email allowlist
  listTunnelEmails: () =>
    get<{ emails: TunnelEmail[] }>("/api/tunnel/allowed-emails"),

  addTunnelEmail: (email: string, role: string) =>
    postJson<{ ok: boolean; email: string; role: string }>("/api/tunnel/allowed-emails", { email, role }),

  deleteTunnelEmail: (email: string) =>
    del<{ ok: boolean }>(`/api/tunnel/allowed-emails/${encodeURIComponent(email)}`),

  // Onboarding
  onboardingPropose: (problem: string, name: string, tool: "claude" | "codex") =>
    postJson<{ sessionId: string; slug: string }>("/api/onboarding/propose", { problem, name, tool }),

  // Knowledge
  knowledgeMemory: (opts?: { type?: string; q?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.type) params.set("type", opts.type);
    if (opts?.q) params.set("q", opts.q);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return get<KnowledgeMemoryResponse>(`/api/knowledge/memory${qs ? `?${qs}` : ""}`);
  },

  knowledgeLearning: (opts?: { type?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.type) params.set("type", opts.type);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return get<KnowledgeLearningResponse>(`/api/knowledge/learning${qs ? `?${qs}` : ""}`);
  },

  knowledgeSkillTimeline: (name: string) =>
    get<SkillTimeline>(`/api/knowledge/skills/${encodeURIComponent(name)}/timeline`),

  knowledgeNarrative: (days = 7) =>
    get<GrowthNarrativeData>(`/api/knowledge/narrative?days=${days}`),

  sessionInsights: (chatId: string) =>
    get<SessionInsightsData>(`/api/sessions/${chatId}/insights`),

  // AI
  aiModels: () =>
    get<{ models: AiModelOption[] }>("/api/ai/models"),

  // File uploads
  uploadFiles: (files: File[]): Promise<{ files: Array<{ name: string; mimeType: string; url: string; size: number }> }> => {
    const form = new FormData();
    for (const f of files) form.append("files[]", f);
    return postFormData("/api/playground/upload", form);
  },

  // Chat
  chat: (
    messages: Array<{ role: string; content: string }>,
    model?: string,
    conversationId?: string,
    projectId?: string,
  ) =>
    postJson<ChatResponse>("/api/ai/chat", { messages, model, conversationId, projectId }),

  chatStart: async (
    messages: Array<{ role: string; content: string; attachments?: Array<{ name: string; mimeType: string; url: string; size: number }> }>,
    model?: string,
    conversationId?: string | null,
    projectId?: string | null,
  ): Promise<{ conversationId: string; status: string }> => {
    const res = await fetch(resolveUrl("/api/ai/chat/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ messages, model, conversationId, projectId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((err as { error: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Conversations
  listConversations: (limit = 50, offset = 0) =>
    get<{ conversations: ConversationSummary[] }>(
      `/api/conversations?limit=${limit}&offset=${offset}`,
    ),

  getConversation: (id: string) =>
    get<ConversationDetail>(`/api/conversations/${id}`),

  deleteConversation: (id: string) =>
    del<{ ok: boolean }>(`/api/conversations/${id}`),

  renameConversation: (id: string, title: string) =>
    patchJson<{ ok: boolean }>(`/api/conversations/${id}`, { title }),

  // Dispatch
  dispatch: (
    input: string,
    agent?: string,
    conversation?: Array<{ role: string; content: string }>,
  ) =>
    postJson<DispatchPayload>("/api/ai/dispatch", { input, agent, conversation }),

  analyze: (input: string, dispatch: DispatchPayload) =>
    postJson<AnalyzeResult>("/api/ai/analyze", { input, dispatch }),

  // RDP
  createRdpSession: (config: string, password?: string, width?: number, height?: number) =>
    postJson<RdpSessionInfo>("/api/rdp", { config, password, width, height }),

  listRdpSessions: () => get<RdpSessionInfo[]>("/api/rdp"),

  getRdpSession: (id: string) => get<RdpSessionInfo>(`/api/rdp/${id}`),

  deleteRdpSession: (id: string) => del<{ deleted: boolean }>(`/api/rdp/${id}`),

  // Saved Sessions
  listSavedSessions: () => get<SavedSession[]>("/api/saved-sessions"),

  createSavedSession: (data: Omit<SavedSession, "id" | "createdAt">) =>
    postJson<SavedSession>("/api/saved-sessions", data),

  updateSavedSession: (id: string, data: Partial<SavedSession>) =>
    fetch(`/api/saved-sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => {
      if (!r.ok) throw new Error(`PUT saved-sessions/${id} failed: ${r.status}`);
      return r.json() as Promise<SavedSession>;
    }),

  deleteSavedSession: (id: string) =>
    del<{ deleted: boolean }>(`/api/saved-sessions/${id}`),

  // Servers
  servers: () => get<ServersResponse>("/api/servers"),

  restartServer: (name: string) =>
    postJson<{ ok: boolean }>(`/api/servers/${encodeURIComponent(name)}/restart`, {}),

  // Profile
  profile: () => get<ProfileData>("/api/profile"),

  // Agents
  agents: () => get<AgentSchedulerState>("/api/agents"),

  triggerAgents: () => postJson<{ ok: boolean }>("/api/agents/trigger", {}),

  triggerJob: (type: AgentJobType) =>
    postJson<{ ok: boolean }>("/api/agents/trigger", { type }),

  cancelPipeline: () => postJson<{ ok: boolean }>("/api/agents/cancel", {}),

  agentsConfig: (config: { intervalMs?: number }) =>
    postJson<{ ok: boolean }>("/api/agents/config", config),

  // Session detail
  sessionDetail: (chatId: string) =>
    get<{ record: SessionRecord | null; analysis: SessionAnalysis | null }>(
      `/api/sessions/${chatId}`,
    ),

  // Session log streaming
  streamSessionLog: async (
    id: string,
    onEntry: (entry: SessionLogEntry) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const res = await fetch(`/api/session-logs/${id}/stream`, { signal });
    if (!res.ok) throw new Error(`GET /api/session-logs/${id}/stream failed: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) {
      // Fallback: fetch all entries at once
      const data = await get<{ entries: SessionLogEntry[] }>(`/api/session-logs/${id}`);
      for (const entry of data.entries) onEntry(entry);
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEntry(JSON.parse(line) as SessionLogEntry);
        } catch { /* skip malformed lines */ }
      }
    }
    if (buffer.trim()) {
      try {
        onEntry(JSON.parse(buffer) as SessionLogEntry);
      } catch { /* skip */ }
    }
  },

  // -- Autoresearch -------------------------------------------------------

  autoresearchStatus: () =>
    get<AutoresearchStatus>("/api/autoresearch/status"),

  autoresearchHistory: (limit = 50) =>
    get<{ experiments: AutoresearchExperiment[] }>(`/api/autoresearch/history?limit=${limit}`),

  autoresearchTree: () =>
    get<AutoresearchTreeResult>("/api/autoresearch/tree"),

  autoresearchMisses: () =>
    get<{ misses: AutoresearchMiss[] }>("/api/autoresearch/misses"),

  autoresearchCandidates: () =>
    get<{ candidates: AutoresearchCandidate[] }>("/api/autoresearch/candidates"),

  autoresearchSetBackend: (backend: string) =>
    postJson<{ ok: boolean }>("/api/autoresearch/backend", { backend }),

  autoresearchStart: (backend = "keywords") =>
    postJson<{ ok: boolean }>("/api/autoresearch/start", { backend }),

  autoresearchStop: () =>
    postJson<{ ok: boolean }>("/api/autoresearch/stop", {}),

  autoresearchEvaluate: (backend = "keywords") =>
    postJson<AutoresearchEvalResult>("/api/autoresearch/evaluate", { backend }),

  autoresearchRunExperiment: (type: string, target: string) =>
    postJson<{ ok: boolean }>("/api/autoresearch/experiment", { type, target }),

  // Mesh
  meshStatus: async (): Promise<MeshStatus> => {
    const raw = await get<MeshStatus>("/api/mesh/status");
    return {
      ...raw,
      node: raw.node ?? raw.node_name,
      peers: raw.peers ?? raw.connected_nodes.map((n) => ({
        name: n.name,
        sessions: n.session_count,
        role: n.role,
        type: n.type,
      })),
    };
  },

  meshCookie: () =>
    get<{ cookie: string }>("/api/mesh/cookie"),

  meshUpdateCookie: (cookie: string) =>
    putJson<{ ok: boolean }>("/api/mesh/cookie", { cookie }),

  meshConnect: (node: string) =>
    postJson<{ ok: boolean; node: string }>("/api/mesh/connect", { node }),

  meshDisconnect: (node: string) =>
    postJson<{ ok: boolean }>("/api/mesh/disconnect", { node }),

  meshSessions: () =>
    get<{ sessions: MeshSession[] }>("/api/mesh/sessions"),

  meshPending: () =>
    get<{ nodes: string[] }>("/api/mesh/pending"),

  meshApprove: (node: string, role: "admin" | "operator" | "viewer" = "operator") =>
    postJson<{ ok: boolean; role: string }>("/api/mesh/approve", { node, role }),

  meshDeny: (node: string) =>
    postJson<{ ok: boolean }>("/api/mesh/deny", { node }),

  meshUpdateRole: (node: string, role: "admin" | "operator" | "viewer") =>
    putJson<{ ok: boolean; role: string }>("/api/mesh/peer/role", { node, role }),

  meshTunnel: () => get<TunnelStatus>("/api/mesh/tunnel"),

  meshTunnelAddPeer: (public_key: string, endpoint: string, proxy_port: number) =>
    postJson<{ ok: boolean }>("/api/mesh/tunnel/peer", { public_key, endpoint, proxy_port }),

  meshCreateInvite: (role: "admin" | "operator" | "viewer" = "operator") =>
    postJson<{ link: string; role: string }>("/api/mesh/invite", { role }),

  meshConnectionInfo: () =>
    get<{ node: string; wg_pubkey: string | null; wg_port: number | null; public_ip: string | null }>("/api/mesh/connection-info"),

  tunnelCreateShare: () =>
    postJson<{ url: string; expires_at: string }>("/api/tunnel/share", {}),

  // Security scanning
  securityStartScan: (url: string) =>
    postJson<{ id: string; status: string }>("/api/security/scan", { url }),

  securityGetScan: (id: string) =>
    get<SecurityScanResult>(`/api/security/scan/${id}`),

  securityListScans: () =>
    get<{ scans: SecurityScanSummary[] }>("/api/security/scans"),

  securityTools: () =>
    get<{ nuclei: boolean; retire: boolean; header_check: boolean }>("/api/security/tools"),

  // Judgment profiler
  judgmentStats: () =>
    get<{ data: JudgmentStats }>("/api/judgment/stats"),

  judgmentScores: () =>
    get<{ data: Record<string, JudgmentSkillScore> }>("/api/judgment/scores"),

  judgmentNegatives: (limit = 50) =>
    get<{ data: JudgmentEntry[] }>(`/api/judgment/negatives?limit=${limit}`),

  judgmentReport: () =>
    get<{ data: { path: string; content: string } | null }>("/api/judgment/report"),

  judgmentGenerateReport: () =>
    postJson<{ data: { path: string; status: string } }>("/api/judgment/report", {}),

  // -- Scheduled Tasks --
  getScheduledTasks: () =>
    get<{ tasks: Array<{
      id: string; title: string; description: string | null;
      action_type: string; payload: Record<string, unknown>;
      schedule: string | null; run_at: string | null;
      recurring: boolean; enabled: boolean;
      last_run_at: string | null; next_run_at: string | null;
      created_by: string; status: string;
      inserted_at: string; updated_at: string;
    }> }>("/api/scheduled-tasks"),

  createScheduledTask: (body: {
    title: string; action_type: string;
    run_at?: string; schedule?: string;
    message?: string; prompt?: string; script?: string; description?: string;
  }) => postJson<{
    id: string; title: string; action_type: string;
    next_run_at: string | null; recurring: boolean; enabled: boolean; status: string;
  }>("/api/scheduled-tasks", body),

  deleteScheduledTask: (id: string) =>
    fetch(resolveUrl(`/api/scheduled-tasks/${id}`), { method: "DELETE", headers: authHeaders() })
      .then((r) => r.json() as Promise<{ ok: boolean }>),

  toggleScheduledTask: (id: string) =>
    postJson<{
      id: string; enabled: boolean; status: string;
    }>(`/api/scheduled-tasks/${id}/toggle`, {}),

  updateScheduledTask: (id: string, body: {
    title?: string; prompt?: string; script?: string; description?: string;
    run_at?: string; schedule?: string; enabled?: boolean;
  }) => patchJson<{
    id: string; title: string; action_type: string;
    next_run_at: string | null; recurring: boolean; enabled: boolean; status: string;
  }>(`/api/scheduled-tasks/${id}`, body),

  triggerScheduledTask: (id: string) =>
    postJson<{ ok: boolean; triggered: string }>(`/api/scheduled-tasks/${id}/trigger`, {}),

  // -- Database explorer --
  dbSchema: () => get<DbSchemaResponse>("/api/db/schema"),

  dbQuery: (sql: string) => postJson<DbQueryResponse>("/api/db/query", { sql }),

  // -- OpenClaw (messaging channels) --
  openclawMessages: (params?: { limit?: number; channel?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.channel) qs.set("channel", params.channel);
    const query = qs.toString();
    return get<{ messages: OpenClawMessage[] }>(`/api/openclaw/messages${query ? `?${query}` : ""}`);
  },

  openclawStatus: () =>
    get<OpenClawStatus>("/api/openclaw/status"),

  openclawStart: () =>
    postJson<{ ok: boolean }>("/api/openclaw/start", {}),

  openclawStop: () =>
    postJson<{ ok: boolean }>("/api/openclaw/stop", {}),

  openclawRestart: () =>
    postJson<{ ok: boolean }>("/api/openclaw/restart", {}),

  openclawChannels: () =>
    get<{ channels: OpenClawChannel[]; welcome_message?: string }>("/api/openclaw/channels"),

  openclawUpdateChannel: (name: string, updates: Record<string, unknown> & { welcome_message?: string }) =>
    putJson<{ ok: boolean }>(`/api/openclaw/channels/${name}`, updates),

  openclawSetEnabled: (enabled: boolean) =>
    putJson<{ ok: boolean; enabled: boolean }>("/api/openclaw/enabled", { enabled }),

  openclawCreateChannel: (name: string, opts?: Record<string, unknown>) =>
    postJson<{ ok: boolean }>("/api/openclaw/channels", { name, ...opts }),

  openclawDeleteChannel: (name: string) =>
    del<{ ok: boolean }>(`/api/openclaw/channels/${name}`),

  openclawChannelQR: (name: string) =>
    get<{ qr: string }>(`/api/openclaw/channels/${name}/qr`),

  openclawChannelLogin: (name: string) =>
    postJson<{ ok: boolean }>(`/api/openclaw/channels/${name}/login`, {}),

  skillImprovements: () =>
    get<SkillImprovement[]>("/api/agents/skill-improvements"),

  applySkillImprovement: (id: string) =>
    postJson<{ ok: boolean }>("/api/agents/skill-improvements/apply", { id }),

  dismissSkillImprovement: (id: string) =>
    postJson<{ ok: boolean }>("/api/agents/skill-improvements/dismiss", { id }),

  synthesisCandidates: () =>
    get<SkillCandidate[]>("/api/agents/synthesis-candidates"),

  draftSynthesisCandidate: (id: string) =>
    postJson<{ ok: boolean; session_id: string }>(`/api/agents/synthesis-candidates/${id}/draft`, {}),

  approveSynthesisCandidate: (id: string) =>
    postJson<{ ok: boolean }>(`/api/agents/synthesis-candidates/${id}/approve`, {}),

  rejectSynthesisCandidate: (id: string) =>
    postJson<{ ok: boolean }>(`/api/agents/synthesis-candidates/${id}/reject`, {}),
};

// -- OpenClaw types --
export interface OpenClawStatus {
  installed: boolean;
  status: "running" | "stopped" | "restarting" | "error";
  started_at: string | null;
  version: string | null;
  port: number;
  enabled: boolean;
  channels_configured: number;
}

export interface OpenClawChannel {
  name: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error" | "unknown";
  last_message_at: string | null;
  message_count_24h: number;
}

export interface OpenClawMessage {
  id?: string;
  channel: string;
  sender: string;
  text: string;
  session_id: string | null;
  direction: "inbound" | "outbound";
  timestamp: number;
  inserted_at?: string;
}

// -- Database explorer types --
export interface DbSchemaColumn {
  name: string;
  type: string;
  pk: boolean;
  notnull: boolean;
}

export interface DbSchemaTable {
  name: string;
  columns: DbSchemaColumn[];
}

export interface DbSchemaResponse {
  tables: DbSchemaTable[];
}

export interface DbQueryResponse {
  columns: string[];
  rows: unknown[][];
  count: number;
  timeMs: number;
  capped: boolean;
}

export interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  name: string;
  cve_id: string | null;
  description: string;
  url: string;
  matched_at: string | null;
  source: "nuclei" | "retire" | "header_check";
  remediation: string | null;
}

export interface SecurityScanResult {
  id: string;
  url: string;
  status: "running" | "complete";
  started_at: string | null;
  completed_at: string | null;
  findings: SecurityFinding[];
  error: string | null;
  tools: { nuclei: boolean; retire: boolean; header_check: boolean };
}

export interface SecurityScanSummary {
  id: string;
  url: string;
  status: "running" | "complete";
  started_at: string | null;
  completed_at: string | null;
  finding_count: number;
  error: string | null;
}

export interface ServerInfo {
  name: string;
  port: number;
  status: "listening" | "down" | "unknown";
}

export interface ServersResponse {
  servers: ServerInfo[];
  pid: number;
  startedAt: string;
}

export interface RdpSessionInfo {
  id: string;
  hostname: string;
  port: number;
  username: string;
  domain: string;
  width: number;
  height: number;
  createdAt: string;
  bridgeAlive: boolean;
}

export interface SavedSession {
  id: string;
  type: "web" | "rdp";
  name: string;
  url?: string;
  config?: string;
  password?: string;
  hostname?: string;
  username?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface TunnelConnection {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface TunnelSession {
  token: string;
  email?: string;
  type?: string;
  role?: string;
  remote_ip?: string;
  created_at: string;
  permissions: string[];
}

export interface TunnelEmail {
  email: string;
  role: string;
}

export interface AiModelOption {
  id: string;
  label: string;
  provider: string;
}

export interface ProposalSummary {
  slug: string;
  title: string;
  date: string;
  status: string;
  repo: string;
  ticket: string | null;
  taskCount: number;
  tasksByStatus: Record<string, number>;
}

export interface ProposalTaskFile {
  id: string;
  filename: string;
  name: string;
  agent: string;
  model: string;
  dependsOn: string[];
  status: string;
  content: string;
}

export interface ProposalSession {
  id: string;
  action: string;
  task: string | null;
  agent: string;
  timestamp: string;
}

export interface ProposalDetail extends ProposalSummary {
  proposal: string;
  impact: string | null;
  tasks: ProposalTaskFile[];
  sessions?: ProposalSession[];
}

export interface MemoryEntry {
  id: string;
  type: string;
  title: string;
  content: string;
  tags: string;
  repo: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningEntry {
  id: string;
  type: string;
  source: string | null;
  content: string;
  metadata: string;
  created_at: string;
  applied_at: string | null;
}

export interface KnowledgeMemoryResponse {
  items: MemoryEntry[];
  total: number;
}

export interface KnowledgeLearningResponse {
  items: LearningEntry[];
  total: number;
}

export interface SkillTimelineSession {
  chatId: string;
  title: string;
  date: string;
  verdict: string;
}

export interface SkillTimelineEvolution {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface SkillTimeline {
  name: string;
  currentContent: string | null;
  sessionsUsedIn: number;
  sessions: SkillTimelineSession[];
  evolutions: SkillTimelineEvolution[];
  learnings: Array<{ id: string; content: string; createdAt: string; appliedAt: string | null }>;
}

export interface GrowthNarrativeData {
  period: { days: number; since: string };
  sessions: { total: number; analyzed: number; verdicts: Record<string, number> };
  approvals: { total: number; approved: number; pending: number };
  learnings: { recent: number };
  topSkills: Array<{ name: string; count: number }>;
  depth: { memoryEntries: number; learningEntries: number; totalSessions: number };
}

export interface SessionInsightsData {
  session: {
    chatId: string;
    title: string;
    summary: string;
    verdict: string;
    date: string;
    skills: string[];
    skillCounts: Record<string, number>;
    userTurns: number;
    assistantTurns: number;
    totalCalls: number;
    fileBytes: number;
  } | null;
  analysis: Record<string, unknown> | null;
  linkedMemory: Array<{ id: string; type: string; content: string; createdAt: string }>;
  linkedLearning: Array<{ id: string; type: string; content: string; createdAt: string }>;
}

export interface SessionLogAnalysis {
  status: string;
  detail: string;
  label?: string;
  summary?: string;
  actionNeeded?: boolean;
  ts: string;
}

export interface SessionLogProfile {
  category?: string;
  color?: string;
  oneLiner?: string;
  doing?: string;
  lastDid?: string;
  profiledAt?: string;
  tools?: Record<string, number>;
  skills?: Array<{ name: string }>;
}

export interface SessionLogMeta {
  id: string;
  command?: string;
  cwd?: string;
  startedAt?: string;
  exitCode?: number;
  lineCount: number;
  sizeBytes: number;
  label?: string;
  summary?: string;
  analysis?: SessionLogAnalysis | null;
  agentType?: string;
  agentSessionId?: string;
  hasMessages?: boolean;
  resumable?: boolean;
  resumedFrom?: string | null;
  resumeCount?: number;
  profile?: SessionLogProfile | null;
  claudeProjectDir?: string;
  source?: string;
}

export interface SessionLogEntry {
  ts: string;
  type: "started" | "output" | "exited";
  data?: string;
  command?: string;
  cwd?: string;
  exitCode?: number;
}

export interface ProfileSkill {
  name: string;
  count: number;
  lastSeen: string;
}

export interface ProfileData {
  skills: ProfileSkill[];
  tools: Array<{ name: string; count: number }>;
  lastScan: string;
  sessions: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  dispatch: { suggested: boolean; quick: boolean; summary: string } | null;
  conversationId: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: number;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls?: unknown[];
  tool_results?: unknown;
  attachments?: Array<{ id: string; name: string; mimeType: string; url: string; size: number }>;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  skills: string[];
  repo: string | null;
  agent: "claude" | "codex";
}

export interface MemoryContext {
  entries: { id: string; type: string; title: string; content: string }[];
  summary: string;
}

export interface DispatchPayload {
  command: string;
  args: string[];
  prompt: string;
  skills: string[];
  repo: string | null;
  cwd: string;
  analysis: ClassificationResult;
  memoryContext: MemoryContext | null;
}

export interface AnalyzeResult {
  ok: boolean;
  intent: string;
  skills: string[];
}

export interface WorkspaceToolCategory {
  id: string;
  label: string;
}

export interface WorkspaceTool {
  path: string;
  language: string;
  category: string;
  description: string;
  risk: string;
  skill: string | null;
  agentUsage: string | null;
  dashboard: boolean;
}

export interface WorkspaceToolsResponse {
  categories: WorkspaceToolCategory[];
  tools: WorkspaceTool[];
}

export interface AutoresearchAwsInfo {
  configured: boolean;
  key_set: boolean;
  secret_set: boolean;
  region: string | null;
}

export interface AutoresearchStatus {
  phase: string;
  active_session: string | null;
  baseline_score: number | null;
  current_score: number | null;
  experiment_count: number;
  experiment_type: string;
  target_name: string | null;
  eval_backend: string;
  last_experiment: string | null;
  latest_score?: number;
  latest_accuracy?: number;
  leaves?: number;
  session_state?: string;
  session_label?: string;
  aws: AutoresearchAwsInfo;
}

export interface AutoresearchExperiment {
  id: string;
  commit_hash: string | null;
  description: string | null;
  retrieval_score: number | null;
  accuracy: number | null;
  leaves: number | null;
  delta: number | null;
  decision: string | null;
  eval_backend: string | null;
  eval_seconds: number | null;
  experiment_type: string | null;
  target_name: string | null;
  approval_id: string | null;
  created_at: string;
}

export interface AutoresearchTreeResult {
  leaf_details: Record<string, unknown>;
  leaves: number;
  retrieval_score: number;
  accuracy: number;
}

export interface AutoresearchMiss {
  chat_id: string;
  date: string;
  query: string;
  predicted: string[];
  actual: string[];
  depth: number;
}

export interface AutoresearchCandidate {
  type: string;
  target: string;
  rationale: string;
  priority: number;
}

export interface AutoresearchEvalResult {
  ok: boolean;
  retrieval_score?: number;
  accuracy?: number;
  leaves?: number;
  error?: string;
}

// -- Judgment profiler types --

export interface JudgmentStats {
  total: number;
  advancing: number;
  non_advancing: number;
  ambiguous: number;
  negative_rate: number;
  top_failing_skills: Array<{ skill: string; rate: number; total: number }>;
}

export interface JudgmentSkillScore {
  total: number;
  negatives: number;
  rate: number;
  top_failure_modes: string[];
}

export interface JudgmentEntry {
  id: string;
  conversation_id: string;
  timestamp: string;
  prompt_a: string;
  output_summary: string;
  tool_actions: string[];
  prompt_b: string;
  verdict: string;
  confidence: number;
  signals: string[];
  active_tools: string[];
  session_context: { turn_number: number };
}

export interface SkillCandidate {
  id: string;
  session_id: string;
  name: string;
  description: string | null;
  triggers: string[];
  report_path: string;
  status: "pending" | "drafting" | "approved" | "rejected";
  inserted_at: string;
}

export interface SkillImprovement {
  id: string;
  skill_name: string;
  drift_summary: string | null;
  replacement_sections: Record<string, string>;
  status: "pending" | "applied" | "dismissed";
  inserted_at: string;
}

export interface JudgmentScoredEvent {
  conversation_id: string;
  verdict: string;
  confidence: number;
  signals: string[];
  prompt_a_preview: string;
  prompt_b_preview: string;
}
