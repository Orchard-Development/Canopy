import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, Chip, Skeleton, IconButton, Tooltip,
  Stack, Button, CircularProgress, alpha, TextField, InputAdornment,
  Card, CardContent, CardActionArea, TablePagination, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import ComputerIcon from "@mui/icons-material/Computer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type SessionLogMeta, type ProjectRecord } from "../lib/api";
import { PageLayout } from "../components/PageLayout";
import { useActiveProject } from "../hooks/useActiveProject";
import { useRefetchOnDashboardEvent } from "../hooks/useRefetchOnDashboardEvent";
import { EVENTS } from "../lib/events";
import { labelForCommand } from "../lib/session-log-utils";
import { requestTerminalOpen } from "../hooks/useDispatch";
import { timeAgo } from "../lib/time";
import { ProfileChip } from "../components/sessions/SessionChips";
import { SessionViewerModal } from "../components/sessions/SessionViewerModal";
import { CardGrid } from "../components/CardGrid";

interface SessionEnrichment {
  firstPrompt?: string;
  analysisSummary?: string;
  filesChanged?: string[];
  outcome?: string;
}

function EmptyState() {
  return (
    <Card variant="outlined" sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <HistoryIcon sx={{ fontSize: 48, color: "text.disabled", opacity: 0.4 }} />
      <Typography variant="h6" color="text.secondary" fontWeight={500}>No sessions yet</Typography>
      <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 340, textAlign: "center" }}>
        Open the terminal drawer to launch an agent session.
        Logs and resume actions will appear here.
      </Typography>
    </Card>
  );
}

function StatsBar({ sessions }: { sessions: SessionLogMeta[] }) {
  const running = sessions.filter((s) => s.exitCode === undefined).length;
  const ended = sessions.filter((s) => s.exitCode !== undefined).length;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        <strong>{sessions.length}</strong> total
      </Typography>
      {running > 0 && (
        <Typography variant="body2" color="success.main">
          <strong>{running}</strong> running
        </Typography>
      )}
      {ended > 0 && (
        <Typography variant="body2" color="text.disabled">
          <strong>{ended}</strong> ended
        </Typography>
      )}
    </Stack>
  );
}

function dayLabel(iso?: string): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - sessionDay.getTime();
  if (diff === 0) return "Today";
  if (diff === 86400000) return "Yesterday";
  if (diff < 7 * 86400000) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

const AGENT_LABELS: Record<string, string> = {
  claude: "Claude", codex: "Codex", cursor: "Cursor",
  gemini: "Gemini", aider: "Aider", opencode: "OpenCode", claw_code: "Claw Code",
};

/** Build a lookup map from project cwds/encoded dirs to friendly project names. */
function buildProjectNameMap(projects: ProjectRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of projects) {
    if (p.root_path) {
      map.set(p.root_path, p.name);
      // Also map the Claude-encoded version of the path
      const encoded = p.root_path.replace(/[^a-zA-Z0-9]/g, "-");
      map.set(encoded, p.name);
    }
  }
  return map;
}

/** Resolve a session's project name using the lookup map. */
function resolveProjectName(s: SessionLogMeta, nameMap: Map<string, string>): string | null {
  // Try exact cwd match first
  if (s.cwd && nameMap.has(s.cwd)) return nameMap.get(s.cwd)!;
  // Try Claude-encoded dir
  if (s.claudeProjectDir && nameMap.has(s.claudeProjectDir)) return nameMap.get(s.claudeProjectDir)!;
  // Try encoding the cwd and matching
  if (s.cwd) {
    const encoded = s.cwd.replace(/[^a-zA-Z0-9]/g, "-");
    if (nameMap.has(encoded)) return nameMap.get(encoded)!;
  }
  // No matching project — show as Global
  return "Global";
}

/** Derive a meaningful title. Prefer AI label, fall back to first prompt snippet, then generic. */
function sessionTitle(s: SessionLogMeta, enrichment?: SessionEnrichment, projectNameMap?: Map<string, string>): string {
  // AI-generated label is best -- but skip if it matches the generic command name
  if (s.label && s.label !== labelForCommand(s.command)) return s.label;
  if (s.label) return s.label;
  // Use first prompt as title if we have it
  if (enrichment?.firstPrompt) {
    const text = enrichment.firstPrompt;
    const firstLine = text.split("\n")[0];
    return firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;
  }
  // Summary as last resort
  if (s.summary) {
    return s.summary.length > 80 ? s.summary.slice(0, 80) + "..." : s.summary;
  }
  // Better fallback than "Session"
  const agent = AGENT_LABELS[s.agentType ?? ""] ?? s.agentType;
  const proj = projectNameMap ? resolveProjectName(s, projectNameMap) : null;
  if (agent && proj) return `${agent} session in ${proj}`;
  if (agent) return `${agent} session`;
  return "Session";
}

function OutcomeBadge({ exitCode }: { exitCode?: number }) {
  if (exitCode === undefined) {
    return <Chip label="running" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />;
  }
  return <Chip label="ended" size="small" variant="outlined" sx={{ height: 20, fontSize: 11, color: "text.secondary", borderColor: "divider" }} />;
}

function SessionCard({
  s, enrichment, onView, onResume, onDelete, onOpenDetail, showProject, projectNameMap,
}: {
  s: SessionLogMeta;
  enrichment?: SessionEnrichment;
  onView: () => void;
  onResume: (id: string, fork: boolean) => void;
  onDelete: (id: string) => void;
  onOpenDetail: () => void;
  showProject?: boolean;
  projectNameMap?: Map<string, string>;
}) {
  const isRunning = s.exitCode === undefined;
  const isRemote = !!s.peer_display_name;
  const summary = enrichment?.analysisSummary || s.summary;
  const title = sessionTitle(s, enrichment, projectNameMap);
  const files = enrichment?.filesChanged ?? [];
  const agentName = AGENT_LABELS[s.agentType ?? ""] ?? s.agentType;
  const proj = showProject && projectNameMap ? resolveProjectName(s, projectNameMap) : null;

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: 3,
        borderLeftColor: isRemote ? "#9c27b0" : isRunning ? "success.main" : "divider",
      }}
    >
      <CardActionArea onClick={onView} sx={{ p: 0, flex: 1 }}>
        <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 }, height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Top badges row */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
            {isRemote && s.peer_machine_id && (
              <Chip
                icon={<ComputerIcon sx={{ fontSize: 12 }} />}
                label={s.peer_machine_id}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: 11, fontWeight: 600, borderColor: "#9c27b0", color: "#9c27b0" }}
              />
            )}
            {agentName && (
              <Chip label={agentName} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, fontWeight: 600 }} />
            )}
            <OutcomeBadge exitCode={s.exitCode} />
            <ProfileChip s={s} />
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
              {s.startedAt ? timeAgo(s.startedAt) : ""}
            </Typography>
          </Stack>

          {/* Title */}
          <Typography variant="body2" fontWeight={600} sx={{
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden", lineHeight: 1.4, mb: 0.5,
          }}>
            {title}
          </Typography>

          {/* Summary -- only if title didn't already consume it */}
          {summary && summary !== title && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                overflow: "hidden", lineHeight: 1.4, mb: 0.5, flex: 1,
              }}
            >
              {summary}
            </Typography>
          )}

          {/* Files changed */}
          {files.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: "auto", pt: 0.5 }}>
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
              <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: 11 }}>
                {files.length <= 3
                  ? files.map((f) => f.split("/").pop()).join(", ")
                  : `${files.slice(0, 2).map((f) => f.split("/").pop()).join(", ")} +${files.length - 2} more`}
              </Typography>
            </Stack>
          )}

          {/* Project label */}
          {proj && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: files.length > 0 ? 0.25 : "auto", pt: 0.25 }}>
              <FolderOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
              <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: 11 }}>
                {proj}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </CardActionArea>

      {/* Action bar */}
      <Stack
        direction="row"
        spacing={0}
        sx={{
          px: 1, py: 0.25,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {isRemote ? (
          <Typography variant="caption" color="text.disabled" sx={{ py: 0.5, px: 0.5, fontSize: 11 }}>
            Remote session — watch coming soon
          </Typography>
        ) : (
          <>
            <Tooltip title="Open detail">
              <IconButton size="small" onClick={onOpenDetail}>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            {s.resumable && (
              <>
                <Tooltip title="Resume session">
                  <IconButton size="small" color="primary" onClick={() => onResume(s.id, false)}>
                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fork as new session">
                  <IconButton size="small" onClick={() => onResume(s.id, true)}>
                    <CallSplitIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Delete session">
              <IconButton size="small" sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }} onClick={() => onDelete(s.id)}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Card>
  );
}

async function fetchEnrichment(id: string): Promise<SessionEnrichment> {
  const enrichment: SessionEnrichment = {};
  const [messagesResult, analysisResult] = await Promise.allSettled([
    api.getSessionMessages(id).catch(() => []),
    fetch(`/api/session-logs/${id}/analysis`).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);
  if (messagesResult.status === "fulfilled" && Array.isArray(messagesResult.value)) {
    const firstUser = messagesResult.value.find((m: { role: string }) => m.role === "user");
    if (firstUser?.text) {
      enrichment.firstPrompt = firstUser.text.length > 200
        ? firstUser.text.slice(0, 200) + "..."
        : firstUser.text;
    }
  }
  if (analysisResult.status === "fulfilled" && analysisResult.value) {
    const analysis = analysisResult.value.analysis ?? analysisResult.value;
    if (analysis.summary) enrichment.analysisSummary = analysis.summary;
    if (Array.isArray(analysis.files_changed)) enrichment.filesChanged = analysis.files_changed;
    if (analysis.outcome) enrichment.outcome = analysis.outcome;
  }
  return enrichment;
}

export default function ProjectSessions() {
  const { project } = useActiveProject();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectCwd = project?.root_path;
  const [all, setAll] = useState<SessionLogMeta[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [enrichments, setEnrichments] = useState<Record<string, SessionEnrichment>>({});
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SessionLogMeta | null>(null);
  const [search, setSearch] = useState("");
  const [messageMatches, setMessageMatches] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"this" | "all" | "machines">("this");
  const [remoteSessions, setRemoteSessions] = useState<SessionLogMeta[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const { generation } = useRefetchOnDashboardEvent(EVENTS.session.exited);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.listSessionLogs().catch(() => [] as SessionLogMeta[]),
      api.listProjects().catch(() => [] as ProjectRecord[]),
    ]).then(([sessions, projs]) => {
      setAll(sessions);
      setProjects(projs);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, generation]);

  // Auto-refresh to pick up external session changes
  useEffect(() => {
    const interval = setInterval(() => {
      api.listSessionLogs().then((sessions) => {
        setAll(sessions);
      }).catch(() => {});
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch remote sessions when "All machines" is selected
  useEffect(() => {
    if (projectFilter !== "machines") {
      setRemoteSessions([]);
      return;
    }
    const fetchRemote = () => {
      api.collabSessions().then((res) => {
        setRemoteSessions(res.sessions.map((s: SessionLogMeta) => ({
          ...s,
          id: s.id || s.agentSessionId || `remote-${Math.random().toString(36).slice(2)}`,
          // Coerce null exitCode to undefined so "running" detection works
          exitCode: s.exitCode === null ? undefined : s.exitCode,
          lineCount: s.lineCount || 0,
          sizeBytes: s.sizeBytes || 0,
        })));
      }).catch(() => setRemoteSessions([]));
    };
    fetchRemote();
    const interval = setInterval(fetchRemote, 10_000);
    return () => clearInterval(interval);
  }, [projectFilter]);

  // Auto-open session from ?open=<id> query param (e.g. from dashboard click)
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || loading || all.length === 0) return;
    const session = all.find((s) => s.id === openId);
    if (session) {
      setViewing(session);
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, loading, all]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enrich visible sessions
  useEffect(() => {
    if (all.length === 0) return;
    const isThisProject = projectFilter === "this";
    const filtered = projectCwd && isThisProject ? all.filter((s) => s.cwd === projectCwd) : all;
    const visible = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    visible.forEach((s) => {
      if (enrichments[s.id]) return;
      fetchEnrichment(s.id).then((data) => {
        setEnrichments((prev) => ({ ...prev, [s.id]: data }));
      }).catch(() => {});
    });
  }, [all, page, rowsPerPage, projectCwd, projectFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced server-side message content search
  useEffect(() => {
    if (!search || search.length < 2) {
      setMessageMatches({});
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api.searchSessionLogs(search).then((res) => {
        const map: Record<string, string> = {};
        for (const m of res.matches) map[m.id] = m.snippet;
        setMessageMatches(map);
      }).catch(() => {
        setMessageMatches({});
      }).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const sessions = useMemo(() => {
    // Claude Code encodes cwd by replacing non-alphanumeric chars with "-"
    const encodedCwd = projectCwd?.replace(/[^a-zA-Z0-9]/g, "-");
    const isThisProject = projectFilter === "this";
    let list = projectCwd && isThisProject
      ? all.filter((s) =>
          s.cwd === projectCwd ||
          (s.claudeProjectDir && encodedCwd && s.claudeProjectDir === encodedCwd)
        )
      : all;
    // Merge remote sessions when viewing all machines
    if (projectFilter === "machines") {
      list = [...list, ...remoteSessions];
    }
    // Hide sessions with no user interaction (enrichment loaded but no firstPrompt, no label, no summary)
    // Always keep running sessions (exitCode undefined) and remote sessions
    list = list.filter((s) => {
      if (s.exitCode === undefined) return true; // Running — always show
      if (s.peer_display_name) return true; // Remote — always show
      const e = enrichments[s.id];
      if (!e) return true; // Not enriched yet — show it (benefit of the doubt)
      // Keep if it has any meaningful content
      return !!(e.firstPrompt || s.label || s.summary || e.analysisSummary);
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        // Check metadata fields
        const hay = [s.label, s.summary, s.command, labelForCommand(s.command), s.agentType,
          enrichments[s.id]?.firstPrompt, enrichments[s.id]?.analysisSummary]
          .filter(Boolean).join(" ").toLowerCase();
        if (hay.includes(q)) return true;
        // Check server-side message content matches
        return !!messageMatches[s.id];
      });
    }
    return list;
  }, [all, projectCwd, projectFilter, search, enrichments, messageMatches, remoteSessions]);

  const projectNameMap = useMemo(() => buildProjectNameMap(projects), [projects]);

  // Auto-switch to all projects if "this project" yields zero results
  useEffect(() => {
    if (projectFilter === "this" && projectCwd && all.length > 0 && sessions.length === 0 && !search) {
      setProjectFilter("all");
    }
  }, [projectFilter, projectCwd, all.length, sessions.length, search]);

  useEffect(() => { setPage(0); }, [search, projectFilter]);

  const localSessions = useMemo(
    () => sessions.filter((s) => !s.peer_display_name),
    [sessions],
  );

  const remoteSessionsByPeer = useMemo(() => {
    const remote = sessions.filter((s) => !!s.peer_display_name);
    const grouped: Record<string, SessionLogMeta[]> = {};
    for (const s of remote) {
      const key = s.peer_display_name || s.peer_node || "Unknown";
      (grouped[key] ??= []).push(s);
    }
    return grouped;
  }, [sessions]);

  const runningSessions = useMemo(
    () => localSessions.filter((s) => s.exitCode === undefined),
    [localSessions],
  );

  const endedSessions = useMemo(
    () => localSessions.filter((s) => s.exitCode !== undefined),
    [localSessions],
  );

  const paged = useMemo(
    () => endedSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [endedSessions, page, rowsPerPage],
  );

  // Group ended sessions by day
  const grouped = useMemo(() => {
    const groups: { label: string; sessions: SessionLogMeta[] }[] = [];
    let currentLabel = "";
    for (const s of paged) {
      const label = dayLabel(s.startedAt);
      if (label !== currentLabel) {
        groups.push({ label, sessions: [s] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].sessions.push(s);
      }
    }
    return groups;
  }, [paged]);

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteSessionLog(id).catch(() => {});
    setAll((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleResume = useCallback(async (id: string, fork: boolean) => {
    setResuming(id);
    try {
      const result = await api.resumeSession(id, fork);
      requestTerminalOpen(result.id, labelForCommand(result.command));
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
    setResuming(null);
  }, [all]);

  const showProject = projectFilter === "all";

  if (loading) {
    return (
      <PageLayout>
        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
        <CardGrid minWidth={300}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={160} />
          ))}
        </CardGrid>
      </PageLayout>
    );
  }

  return (
    <>
    <PageLayout
      actions={
        <Stack direction="row" spacing={0.5} alignItems="center">
          {resuming && <CircularProgress size={14} />}
          <Button size="small" onClick={load}>Refresh</Button>
        </Stack>
      }
    >
      {sessions.length === 0 && !search ? <EmptyState /> : (
        <>
          <StatsBar sessions={sessions} />

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search sessions and messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                endAdornment: searching ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : undefined,
              }}}
              sx={{ maxWidth: 400 }}
              fullWidth
            />
            {projectCwd && (
              <ToggleButtonGroup
                value={projectFilter}
                exclusive
                onChange={(_, v) => { if (v) setProjectFilter(v); }}
                size="small"
                sx={{ "& .MuiToggleButton-root": { fontSize: 12, py: 0.5, px: 1.5, textTransform: "none" } }}
              >
                <ToggleButton value="this">This project</ToggleButton>
                <ToggleButton value="all">All projects</ToggleButton>
                <ToggleButton value="machines">All machines</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>

          {sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No sessions match{search ? " your search" : ""}.
            </Typography>
          ) : (
            <>
              {runningSessions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" color="success.main" sx={{ mb: 1, display: "block", fontWeight: 700 }}>
                    Active
                  </Typography>
                  <CardGrid minWidth={300}>
                    {runningSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        s={s}
                        enrichment={enrichments[s.id]}
                        onView={() => setViewing(s)}
                        onResume={handleResume}
                        onDelete={handleDelete}
                        onOpenDetail={() => navigate(`/sessions/${s.id}`)}
                        showProject={showProject}
                        projectNameMap={projectNameMap}
                      />
                    ))}
                  </CardGrid>
                </Box>
              )}

              {/* Remote sessions grouped by person/machine */}
              {Object.entries(remoteSessionsByPeer).map(([peerName, peerSessions]) => (
                <Box key={`remote-${peerName}`} sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <ComputerIcon sx={{ fontSize: 16, color: "success.main" }} />
                    <Typography variant="overline" color="success.main" sx={{ display: "block", fontWeight: 700 }}>
                      {peerName}
                    </Typography>
                    <Chip label={`${peerSessions.length} session${peerSessions.length === 1 ? "" : "s"}`} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, color: "text.disabled" }} />
                  </Stack>
                  <CardGrid minWidth={300}>
                    {peerSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        s={s}
                        enrichment={enrichments[s.id]}
                        onView={() => setViewing(s)}
                        onResume={() => {}}
                        onDelete={() => {}}
                        onOpenDetail={() => {}}
                        showProject={showProject}
                        projectNameMap={projectNameMap}
                      />
                    ))}
                  </CardGrid>
                </Box>
              ))}

              {grouped.map((group) => (
                <Box key={group.label} sx={{ mb: 3 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    {group.label}
                  </Typography>
                  <CardGrid minWidth={300}>
                    {group.sessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        s={s}
                        enrichment={enrichments[s.id]}
                        onView={() => setViewing(s)}
                        onResume={handleResume}
                        onDelete={handleDelete}
                        onOpenDetail={() => navigate(`/sessions/${s.id}`)}
                        showProject={showProject}
                        projectNameMap={projectNameMap}
                      />
                    ))}
                  </CardGrid>
                </Box>
              ))}
              <TablePagination
                component="div"
                count={endedSessions.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </>
          )}
        </>
      )}
    </PageLayout>
    {viewing && (
      <SessionViewerModal
        session={viewing}
        sessions={sessions}
        onClose={() => setViewing(null)}
        onNavigate={setViewing}
        onResume={handleResume}
      />
    )}
    </>
  );
}
