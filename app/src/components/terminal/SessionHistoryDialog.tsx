import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Chip, Button, Typography, List, ListItemButton,
  ListItemText, InputAdornment, CircularProgress, Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import TerminalIcon from "@mui/icons-material/Terminal";
import { api, type SessionLogMeta } from "../../lib/api";
import { requestTerminalOpen } from "../../hooks/useDispatch";
import { formatTime, labelForCommand } from "../../lib/session-log-utils";

const AGENT_TYPES = ["claude", "codex", "gemini"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, sessions are filtered to this directory by default. */
  projectCwd?: string;
}

export function SessionHistoryDialog({ open, onClose, projectCwd }: Props) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionLogMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [resumableOnly, setResumableOnly] = useState(true);
  const [projectOnly, setProjectOnly] = useState(!!projectCwd);
  const [selected, setSelected] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [messageMatches, setMessageMatches] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.listSessionLogs()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter((s) => {
      if (resumableOnly && !s.resumable) return false;
      if (agentFilter && s.agentType !== agentFilter) return false;
      if (projectOnly && projectCwd && s.cwd !== projectCwd) return false;
      if (!q) return true;
      const haystack = [s.summary, s.cwd, s.command, labelForCommand(s.command)]
        .filter(Boolean).join(" ").toLowerCase();
      if (haystack.includes(q)) return true;
      return !!messageMatches[s.id];
    });
  }, [sessions, search, agentFilter, resumableOnly, projectOnly, projectCwd, messageMatches]);

  const selectedSession = useMemo(
    () => filtered.find((s) => s.id === selected) ?? null,
    [filtered, selected],
  );

  const handleResume = useCallback(async (fork: boolean) => {
    if (!selected) return;
    setResuming(true);
    try {
      const result = await api.resumeSession(selected, fork);
      requestTerminalOpen(result.id, labelForCommand(result.command));
      onClose();
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
    setResuming(false);
  }, [selected, selectedSession, onClose]);

  const handleFocusTerminal = useCallback(() => {
    if (!selected) return;
    const label = selectedSession ? labelForCommand(selectedSession.command) : "Terminal";
    requestTerminalOpen(selected, label);
    onClose();
  }, [selected, selectedSession, onClose]);

  const handleViewLog = useCallback(() => {
    if (!selected) return;
    onClose();
    navigate(`/sessions/${selected}`);
  }, [selected, onClose, navigate]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Session History</DialogTitle>
      <DialogContent sx={{ pb: 0 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search sessions and messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
            endAdornment: searching ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : undefined,
          }}}
          sx={{ mb: 1 }}
        />
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }} flexWrap="wrap">
          {projectCwd && (
            <Chip
              label="This project"
              size="small"
              variant={projectOnly ? "filled" : "outlined"}
              color={projectOnly ? "primary" : "default"}
              onClick={() => setProjectOnly(!projectOnly)}
            />
          )}
          <Chip
            label="Resumable only"
            size="small"
            variant={resumableOnly ? "filled" : "outlined"}
            color={resumableOnly ? "success" : "default"}
            onClick={() => setResumableOnly(!resumableOnly)}
          />
          {AGENT_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              variant={agentFilter === t ? "filled" : "outlined"}
              color={agentFilter === t ? "primary" : "default"}
              onClick={() => setAgentFilter(agentFilter === t ? null : t)}
            />
          ))}
        </Stack>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
            No matching sessions.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
            {filtered.map((s) => (
              <ListItemButton
                key={s.id}
                selected={selected === s.id}
                onClick={() => setSelected(s.id)}
                onDoubleClick={() => { setSelected(s.id); handleResume(false); }}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {labelForCommand(s.command)}
                      </Typography>
                      {s.agentType && (
                        <Chip label={s.agentType} size="small" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                      )}
                      {s.resumable && (
                        <Chip label="resumable" size="small" color="success" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                      )}
                      {s.exitCode !== undefined && (
                        <Chip
                          label={`exit ${s.exitCode}`}
                          size="small"
                          color={s.exitCode === 0 ? "success" : "error"}
                          sx={{ height: 16, fontSize: 10 }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {s.summary ?? s.cwd ?? "--"} -- {formatTime(s.startedAt)}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          startIcon={resuming ? <CircularProgress size={14} /> : <PlayArrowIcon />}
          disabled={!selectedSession?.resumable || resuming}
          onClick={() => handleResume(false)}
          variant="contained"
          size="small"
        >
          Resume
        </Button>
        <Button
          startIcon={<CallSplitIcon />}
          disabled={!selectedSession?.resumable || resuming}
          onClick={() => handleResume(true)}
          size="small"
        >
          Fork
        </Button>
        <Button
          startIcon={<TerminalIcon />}
          disabled={!selected || selectedSession?.exitCode !== undefined}
          onClick={handleFocusTerminal}
          size="small"
        >
          Focus
        </Button>
        <Button
          startIcon={<ArticleOutlinedIcon />}
          disabled={!selected}
          onClick={handleViewLog}
          size="small"
        >
          View Log
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
