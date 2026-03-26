import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, Chip, Skeleton, IconButton, Tooltip,
  Stack, Button, CircularProgress, alpha, TextField, InputAdornment,
  Card, CardContent, Paper, TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { api, type SessionLogMeta } from "../lib/api";
import { PageLayout } from "../components/PageLayout";
import { useActiveProject } from "../hooks/useActiveProject";
import { useRefetchOnDashboardEvent } from "../hooks/useRefetchOnDashboardEvent";
import { EVENTS } from "../lib/events";
import { labelForCommand } from "../lib/session-log-utils";
import { timeAgo } from "../lib/time";
import { StatusChip, ProfileChip } from "../components/sessions/SessionChips";
import { SessionViewerModal } from "../components/sessions/SessionViewerModal";

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
        {resumable > 0 && (
          <Box>
            <Typography variant="h5" fontWeight={700} color="success.main">{resumable}</Typography>
            <Typography variant="body2" color="text.secondary">Resumable</Typography>
          </Box>
        )}
      </Stack>
    </Card>
  );
}

function SessionRow({
  s, onView, onResume, onDelete,
}: {
  s: SessionLogMeta;
  onView: () => void;
  onResume: (id: string, fork: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const isRunning = s.exitCode === undefined;
  return (
    <Box
      onClick={onView}
      sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 2, py: 1.5,
        cursor: "pointer",
        borderBottom: 1, borderColor: "divider",
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
        "&:last-child": { borderBottom: 0 },
      }}
    >
      {/* Status dot */}
      <FiberManualRecordIcon sx={{
        fontSize: 8, flexShrink: 0,
        color: isRunning ? "info.main" : s.exitCode === 0 ? "success.main" : "error.main",
      }} />

      {/* Name + summary */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {s.label || labelForCommand(s.command)}
        </Typography>
        {s.summary && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
            {s.summary}
          </Typography>
        )}
      </Box>

      {/* Chips */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
        <ProfileChip s={s} />
        <StatusChip s={s} />
        {s.resumable && (
          <Chip label="resumable" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        )}
      </Stack>

      {/* Timestamp */}
      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, minWidth: 60, textAlign: "right" }}>
        {s.startedAt ? timeAgo(s.startedAt) : ""}
      </Typography>

      {/* Actions */}
      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
        <Tooltip title="Delete">
          <IconButton size="small" sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }} onClick={() => onDelete(s.id)}>
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default function ProjectSessions() {
  const { project } = useActiveProject();
  const projectCwd = project?.root_path;
  const [all, setAll] = useState<SessionLogMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SessionLogMeta | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { generation } = useRefetchOnDashboardEvent(EVENTS.session.exited);

  const load = useCallback(() => {
    setLoading(true);
    api.listSessionLogs().then(setAll).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, generation]);

  const sessions = useMemo(() => {
    let list = projectCwd ? all.filter((s) => s.cwd === projectCwd) : all;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        const hay = [s.label, s.summary, s.command, labelForCommand(s.command), s.agentType]
          .filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [all, projectCwd, search]);

  useEffect(() => { setPage(0); }, [search]);

  const paged = useMemo(
    () => sessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sessions, page, rowsPerPage],
  );

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteSessionLog(id).catch(() => {});
    setAll((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleResume = useCallback(async (id: string, fork: boolean) => {
    setResuming(id);
    try { await api.resumeSession(id, fork); } catch { /* terminal opens via channel event */ }
    setResuming(null);
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
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
      {all.length === 0 ? <EmptyState /> : (
        <>
          <StatsBar sessions={sessions} />

          <TextField
            size="small"
            placeholder="Search by name, summary, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}}
            sx={{ mb: 1.5, maxWidth: 400 }}
            fullWidth
          />

          {sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No sessions match your search.
            </Typography>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              {paged.map((s) => (
                <SessionRow
                  key={s.id}
                  s={s}
                  onView={() => setViewing(s)}
                  onResume={handleResume}
                  onDelete={handleDelete}
                />
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
            </Paper>
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
