import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, Chip, Skeleton, IconButton, Tooltip,
  Stack, Button, CircularProgress, alpha, TextField, InputAdornment,
  Card, CardContent, CardActionArea, TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type SessionLogMeta } from "../lib/api";
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
  const resumable = sessions.filter((s) => s.resumable).length;
  const succeeded = sessions.filter((s) => s.exitCode === 0).length;
  const failed = sessions.filter((s) => s.exitCode !== undefined && s.exitCode !== 0).length;
  return (
    <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
      <Stack direction="row" spacing={{ xs: 3, sm: 5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{sessions.length}</Typography>
          <Typography variant="body2" color="text.secondary">Total</Typography>
        </Box>
        {running > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="info.main">{running}</Typography>
            <Typography variant="body2" color="text.secondary">Running</Typography>
          </Box>
        )}
        {succeeded > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="success.main">{succeeded}</Typography>
            <Typography variant="body2" color="text.secondary">Succeeded</Typography>
          </Box>
        )}
        {failed > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="error.main">{failed}</Typography>
            <Typography variant="body2" color="text.secondary">Failed</Typography>
          </Box>
        )}
        {resumable > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: "success.main" }}>{resumable}</Typography>
            <Typography variant="body2" color="text.secondary">Resumable</Typography>
          </Box>
        )}
      </Stack>
    </Card>
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

/** Derive a meaningful title. Prefer AI label, fall back to first prompt snippet, then generic. */
function sessionTitle(s: SessionLogMeta, enrichment?: SessionEnrichment): string {
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
  return "Session";
}

function OutcomeBadge({ exitCode }: { exitCode?: number }) {
  if (exitCode === undefined) {
    return <Chip label="running" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: 11 }} />;
  }
  if (exitCode === 0) {
    return <Chip icon={<CheckCircleOutlineIcon sx={{ fontSize: "14px !important" }} />} label="done" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />;
  }
  return <Chip icon={<ErrorOutlineIcon sx={{ fontSize: "14px !important" }} />} label={`exit ${exitCode}`} size="small" color="error" sx={{ height: 20, fontSize: 11 }} />;
}

function SessionCard({
  s, enrichment, onView, onResume, onDelete, onOpenDetail,
}: {
  s: SessionLogMeta;
  enrichment?: SessionEnrichment;
  onView: () => void;
  onResume: (id: string, fork: boolean) => void;
  onDelete: (id: string) => void;
  onOpenDetail: () => void;
}) {
  const isRunning = s.exitCode === undefined;
  const summary = enrichment?.analysisSummary || s.summary;
  const title = sessionTitle(s, enrichment);
  const files = enrichment?.filesChanged ?? [];
  const agentName = AGENT_LABELS[s.agentType ?? ""] ?? s.agentType;

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: 3,
        borderLeftColor: isRunning ? "info.main" : s.exitCode === 0 ? "success.main" : "error.main",
      }}
    >
      <CardActionArea onClick={onView} sx={{ p: 0, flex: 1 }}>
        <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 }, height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Top badges row */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
            {agentName && (
              <Chip label={agentName} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, fontWeight: 600 }} />
            )}
            <OutcomeBadge exitCode={s.exitCode} />
            <ProfileChip s={s} />
            {s.resumable && (
              <Chip label="resumable" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}
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
        <Tooltip title="Open detail">
          <IconButton size="small" onClick={onOpenDetail}>
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        {s.resumable && (
          <>
            <Tooltip title="Resume">
              <IconButton size="small" color="primary" onClick={() => onResume(s.id, false)}>
                <PlayArrowIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fork">
              <IconButton size="small" onClick={() => onResume(s.id, true)}>
                <CallSplitIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Delete">
          <IconButton size="small" sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }} onClick={() => onDelete(s.id)}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
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
  const [enrichments, setEnrichments] = useState<Record<string, SessionEnrichment>>({});
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SessionLogMeta | null>(null);
  const [search, setSearch] = useState("");
  const [messageMatches, setMessageMatches] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [projectFilter, setProjectFilter] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { generation } = useRefetchOnDashboardEvent(EVENTS.session.exited);

  const load = useCallback(() => {
    setLoading(true);
    api.listSessionLogs().then(setAll).catch((err) => {
      console.warn("Failed to load session logs:", err);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, generation]);

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
    const filtered = projectCwd && projectFilter ? all.filter((s) => s.cwd === projectCwd) : all;
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
    let list = projectCwd && projectFilter ? all.filter((s) => s.cwd === projectCwd) : all;
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
  }, [all, projectCwd, projectFilter, search, enrichments, messageMatches]);

  // Auto-disable project filter if it yields zero results but all has sessions
  useEffect(() => {
    if (projectFilter && projectCwd && all.length > 0 && sessions.length === 0 && !search) {
      setProjectFilter(false);
    }
  }, [projectFilter, projectCwd, all.length, sessions.length, search]);

  useEffect(() => { setPage(0); }, [search, projectFilter]);

  const paged = useMemo(
    () => sessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sessions, page, rowsPerPage],
  );

  // Group by day
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

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
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
              <Chip
                label={projectFilter ? "This project" : "All projects"}
                size="small"
                color={projectFilter ? "primary" : "default"}
                variant={projectFilter ? "filled" : "outlined"}
                onClick={() => setProjectFilter(!projectFilter)}
                sx={{ cursor: "pointer" }}
              />
            )}
          </Stack>

          {sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No sessions match{search ? " your search" : ""}.
            </Typography>
          ) : (
            <>
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
                      />
                    ))}
                  </CardGrid>
                </Box>
              ))}
              <TablePagination
                component="div"
                count={sessions.length}
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
