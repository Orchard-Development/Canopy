import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Chip, IconButton, Tooltip,
  Stack, Button, CircularProgress, alpha,
  Paper, Dialog, DialogTitle, DialogActions, LinearProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import TerminalIcon from "@mui/icons-material/Terminal";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { api, type SessionLogMeta } from "../../lib/api";
import { terminalOptions } from "../../lib/xterm-theme";
import { labelForCommand } from "../../lib/session-log-utils";
import { StatusChip, ProfileChip } from "./SessionChips";
import { useNavigate } from "react-router-dom";

const MSG_COLLAPSED_HEIGHT = 160;

function MessageBubble({ message }: { message: { role: string; text: string } }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.scrollHeight > MSG_COLLAPSED_HEIGHT) {
      setOverflows(true);
    }
  }, [message.text]);

  const isUser = message.role === "user";

  return (
    <Box
      sx={{
        py: 1.5, px: 2, borderBottom: 1, borderColor: "divider",
        bgcolor: isUser ? alpha(theme.palette.primary.main, 0.04) : "transparent",
        position: "relative",
      }}
    >
      <Typography
        variant="caption"
        fontWeight={700}
        color={isUser ? "primary.main" : "text.secondary"}
        sx={{ mb: 0.5, display: "block" }}
      >
        {isUser ? "You" : "Assistant"}
      </Typography>
      <Box
        ref={ref}
        sx={{
          maxHeight: expanded ? undefined : MSG_COLLAPSED_HEIGHT,
          overflow: "hidden",
          position: "relative",
          ...(!expanded && overflows && {
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: `linear-gradient(transparent, ${isUser ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper})`,
              pointerEvents: "none",
            },
          }),
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {message.text}
        </Typography>
      </Box>
      {overflows && (
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ mt: 0.5, textTransform: "none", fontSize: 11 }}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </Box>
  );
}

function MessagesPanel({ sessionId, peerNode }: { sessionId: string; peerNode?: string }) {
  const [messages, setMessages] = useState<Array<{ role: string; text: string; ts?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = peerNode
      ? api.getRemoteSessionMessages(peerNode, sessionId)
      : api.getSessionMessages(sessionId);
    fetcher
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [sessionId, peerNode]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.75,
        borderBottom: 1, borderColor: "divider",
        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
      }}>
        <ChatIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" fontWeight={600} color="primary.main">Messages</Typography>
        {!loading && (
          <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
            {messages.length} turns
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ p: 3, textAlign: "center" }}>
            No messages found.
          </Typography>
        ) : (
          <Stack spacing={0}>
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function TerminalPanel({ sessionId, peerNode }: { sessionId: string; peerNode?: string }) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const term = new Terminal({
        ...terminalOptions(theme),
        fontSize: 13, cursorBlink: false, disableStdin: true, scrollback: 10000,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(el);
      fit.fit();
      const observer = new ResizeObserver(() => fit.fit());
      observer.observe(el);
      const abort = new AbortController();
      setStreaming(true);
      const streamUrl = peerNode
        ? `/api/mesh/collab/relay/${encodeURIComponent(peerNode)}/${sessionId}/stream`
        : `/api/session-logs/${sessionId}/stream`;
      const streamFn = async (signal: AbortSignal) => {
        const res = await fetch(streamUrl, { signal });
        if (!res.ok) throw new Error(`Stream failed: ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const entry = JSON.parse(line);
              if (entry.type === "output" && entry.data) term.write(entry.data);
              else if (entry.type === "exited") term.write(`\r\n\x1b[90m[exited ${entry.exitCode ?? "?"}]\x1b[0m\r\n`);
            } catch { /* skip malformed lines */ }
          }
        }
        term.scrollToTop();
      };
      streamFn(abort.signal)
        .catch(() => { if (!abort.signal.aborted) term.write("\x1b[31m[load failed]\x1b[0m\r\n"); })
        .finally(() => setStreaming(false));
      (el as any).__cleanup = () => { abort.abort(); observer.disconnect(); term.dispose(); };
    });
    return () => {
      cancelAnimationFrame(raf);
      const el = containerRef.current;
      if (el && (el as any).__cleanup) (el as any).__cleanup();
    };
  }, [sessionId, theme]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.75,
        borderBottom: 1, borderColor: "divider",
        bgcolor: (t) => alpha(t.palette.secondary.main, 0.06),
      }}>
        <TerminalIcon sx={{ fontSize: 16, color: "secondary.main" }} />
        <Typography variant="caption" fontWeight={600} color="secondary.main">Terminal</Typography>
        {streaming && <CircularProgress size={12} sx={{ ml: "auto", color: "secondary.main" }} />}
      </Box>
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {streaming && <LinearProgress color="secondary" sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 }} />}
        <Box ref={containerRef} sx={{ height: "100%", overflow: "hidden", "& .xterm": { height: "100%", p: 0.5 } }} />
      </Box>
    </Box>
  );
}

interface AnalysisSummary {
  summary?: string;
  filesChanged?: string[];
  outcome?: string;
  toolsUsed?: string[];
  keyDecisions?: string[];
}

function AnalysisBanner({ sessionId }: { sessionId: string }) {
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/session-logs/${sessionId}/analysis`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const a = data.analysis ?? data;
        setAnalysis({
          summary: a.summary,
          filesChanged: a.files_changed,
          outcome: a.outcome,
          toolsUsed: a.tools_used,
          keyDecisions: a.key_decisions,
        });
      })
      .catch(() => {});
  }, [sessionId]);

  const handleAnalyze = () => {
    setAnalyzing(true);
    api.analyzeSessionLog(sessionId)
      .then((data) => {
        const a = (data as any).analysis ?? data;
        setAnalysis({
          summary: a.summary,
          filesChanged: a.files_changed,
          outcome: a.outcome,
          toolsUsed: a.tools_used,
          keyDecisions: a.key_decisions,
        });
      })
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  };

  if (!analysis) {
    return (
      <Box sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: "divider" }}>
        <Button
          size="small"
          startIcon={analyzing ? <CircularProgress size={12} /> : <AutoFixHighIcon />}
          onClick={handleAnalyze}
          disabled={analyzing}
          sx={{ textTransform: "none", fontSize: 12 }}
        >
          {analyzing ? "Analyzing..." : "Analyze session"}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: (t) => alpha(t.palette.info.main, 0.04) }}>
      {analysis.summary && (
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, lineHeight: 1.4 }}>
          {analysis.summary}
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {analysis.outcome && (
          <Chip
            label={analysis.outcome}
            size="small"
            color={analysis.outcome === "success" ? "success" : analysis.outcome === "failure" ? "error" : "warning"}
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
        {analysis.filesChanged && analysis.filesChanged.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <InsertDriveFileOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography variant="caption" color="text.disabled">
              {analysis.filesChanged.length} file{analysis.filesChanged.length !== 1 ? "s" : ""}
            </Typography>
          </Stack>
        )}
        {analysis.keyDecisions && analysis.keyDecisions.length > 0 && (
          <Typography variant="caption" color="text.disabled">
            {analysis.keyDecisions.length} decision{analysis.keyDecisions.length !== 1 ? "s" : ""}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          startIcon={analyzing ? <CircularProgress size={12} /> : <AutoFixHighIcon />}
          onClick={handleAnalyze}
          disabled={analyzing}
          sx={{ textTransform: "none", fontSize: 11 }}
        >
          Re-analyze
        </Button>
      </Stack>
    </Box>
  );
}

export function SessionViewerModal({
  session,
  sessions,
  onClose,
  onNavigate,
  onResume,
}: {
  session: SessionLogMeta | null;
  sessions: SessionLogMeta[];
  onClose: () => void;
  onNavigate: (s: SessionLogMeta) => void;
  onResume: (id: string, fork: boolean) => void;
}) {
  const navigate = useNavigate();
  const currentIndex = session ? sessions.findIndex((s) => s.id === session.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < sessions.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(sessions[currentIndex - 1]);
  }, [hasPrev, sessions, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(sessions[currentIndex + 1]);
  }, [hasNext, sessions, currentIndex, onNavigate]);

  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session, goPrev, goNext]);

  if (!session) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, pb: 0 }}>
        <Tooltip title="Previous session (Left arrow)">
          <span>
            <IconButton size="small" onClick={goPrev} disabled={!hasPrev}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Next session (Right arrow)">
          <span>
            <IconButton size="small" onClick={goNext} disabled={!hasNext}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {session.label || labelForCommand(session.command)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {currentIndex + 1} / {sessions.length}
        </Typography>
        {session.peer_node && (
          <Chip label={`Remote — ${session.peer_machine_id || session.peer_display_name || "peer"}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, borderColor: "#9c27b0", color: "#9c27b0" }} />
        )}
        <ProfileChip s={session} />
        <StatusChip s={session} />
        {!session.peer_node && session.resumable && <Chip label="resumable" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
        <Tooltip title="Open full detail page">
          <IconButton size="small" onClick={() => { onClose(); navigate(`/sessions/${session.id}`); }}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      {/* Profile one-liner */}
      {session.profile?.oneLiner && (
        <Box sx={{ px: 2, pb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
            {session.profile.oneLiner}
            {session.profile.doing && ` \u2014 ${session.profile.doing}`}
          </Typography>
        </Box>
      )}

      {/* Analysis banner */}
      <AnalysisBanner sessionId={session.id} />

      {/* Split panes */}
      <Box sx={{
        display: "flex", gap: 1, px: 1.5, pb: 1,
        height: "calc(70vh - 60px)",
        overflow: "hidden",
      }}>
        <Paper
          variant="outlined"
          sx={{ flex: 1, minWidth: 0, overflow: "hidden", borderColor: (t) => alpha(t.palette.primary.main, 0.2) }}
        >
          <MessagesPanel sessionId={session.id} peerNode={session.peer_node} />
        </Paper>
        <Paper
          variant="outlined"
          sx={{ flex: 1, minWidth: 0, overflow: "hidden", borderColor: (t) => alpha(t.palette.secondary.main, 0.2) }}
        >
          <TerminalPanel sessionId={session.id} peerNode={session.peer_node} />
        </Paper>
      </Box>

      {/* Footer */}
      <DialogActions sx={{ px: 2, py: 1 }}>
        {session.summary && (
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }} noWrap>
            {session.summary}
          </Typography>
        )}
        {session.resumable && (
          <>
            <Button size="small" startIcon={<PlayArrowIcon />} variant="contained" onClick={() => { onResume(session.id, false); onClose(); }}>
              Resume
            </Button>
            <Button size="small" startIcon={<CallSplitIcon />} onClick={() => { onResume(session.id, true); onClose(); }}>
              Fork
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
