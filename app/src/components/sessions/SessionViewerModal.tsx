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
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { api, type SessionLogMeta } from "../../lib/api";
import { terminalOptions } from "../../lib/xterm-theme";
import { labelForCommand } from "../../lib/session-log-utils";
import { StatusChip, ProfileChip } from "./SessionChips";

function MessagesPanel({ sessionId }: { sessionId: string }) {
  const theme = useTheme();
  const [messages, setMessages] = useState<Array<{ role: string; text: string; ts?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getSessionMessages(sessionId)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

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
              <Box
                key={i}
                sx={{
                  py: 1.5, px: 2, borderBottom: 1, borderColor: "divider",
                  bgcolor: m.role === "user"
                    ? alpha(theme.palette.primary.main, 0.04)
                    : "transparent",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color={m.role === "user" ? "primary.main" : "text.secondary"}
                  sx={{ mb: 0.5, display: "block" }}
                >
                  {m.role === "user" ? "You" : "Assistant"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    maxHeight: m.role === "assistant" ? 200 : undefined,
                    overflow: m.role === "assistant" ? "hidden" : undefined,
                  }}
                >
                  {m.text}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function TerminalPanel({ sessionId }: { sessionId: string }) {
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
      api.streamSessionLog(sessionId, (entry) => {
        if (entry.type === "output" && entry.data) term.write(entry.data);
        else if (entry.type === "exited") term.write(`\r\n\x1b[90m[exited ${entry.exitCode ?? "?"}]\x1b[0m\r\n`);
      }, abort.signal)
        .then(() => term.scrollToTop())
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
        <ProfileChip s={session} />
        <StatusChip s={session} />
        {session.resumable && <Chip label="resumable" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      {session.profile?.oneLiner && (
        <Box sx={{ px: 2, pb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
            {session.profile.oneLiner}
            {session.profile.doing && ` \u2014 ${session.profile.doing}`}
          </Typography>
        </Box>
      )}
      <Box sx={{
        display: "flex", gap: 1, px: 1.5, pb: 1,
        height: session.profile?.oneLiner ? "calc(80vh - 148px)" : "calc(80vh - 120px)",
        overflow: "hidden",
      }}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1, minWidth: 0, overflow: "hidden",
            borderColor: (t) => alpha(t.palette.primary.main, 0.2),
          }}
        >
          <MessagesPanel sessionId={session.id} />
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            flex: 1, minWidth: 0, overflow: "hidden",
            borderColor: (t) => alpha(t.palette.secondary.main, 0.2),
          }}
        >
          <TerminalPanel sessionId={session.id} />
        </Paper>
      </Box>
      {session.resumable && (
        <DialogActions sx={{ px: 2, py: 1 }}>
          {session.summary && (
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }} noWrap>
              {session.summary}
            </Typography>
          )}
          <Button size="small" startIcon={<PlayArrowIcon />} variant="contained" onClick={() => { onResume(session.id, false); onClose(); }}>
            Resume
          </Button>
          <Button size="small" startIcon={<CallSplitIcon />} onClick={() => { onResume(session.id, true); onClose(); }}>
            Fork
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
