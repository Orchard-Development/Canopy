import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import {
  Box, Typography, Chip, IconButton, Tooltip, Paper, Stack, Button,
  LinearProgress, Skeleton, Alert, CircularProgress, ButtonGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import TerminalIcon from "@mui/icons-material/Terminal";
import ChatIcon from "@mui/icons-material/Chat";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { api, type SessionLogMeta, type SessionLogAnalysis } from "../lib/api";
import { requestTerminalOpen } from "../hooks/useDispatch";
import { terminalOptions } from "../lib/xterm-theme";
import { PageLayout } from "../components/PageLayout";
import { formatTime, labelForCommand, statusColor } from "../lib/session-log-utils";
import { useSessionMessages } from "../hooks/useSessionMessages";
import { ChatMessages } from "../components/chat/ChatMessages";
import { sessionMessagesToChat } from "../lib/sessionConvert";

function AnalysisPanel({ analysis }: { analysis: SessionLogAnalysis }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2">Analysis</Typography>
        <Chip label={analysis.status} size="small" color={statusColor(analysis.status)} />
        {analysis.actionNeeded && <Chip label="action needed" size="small" color="warning" />}
      </Stack>
      <Typography variant="body2" color="text.secondary">{analysis.detail}</Typography>
      {analysis.summary && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          {analysis.summary}
        </Typography>
      )}
      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
        Analyzed {formatTime(analysis.ts)}
      </Typography>
    </Paper>
  );
}

function ResumeChain({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [chain, setChain] = useState<SessionLogMeta[]>([]);

  useEffect(() => {
    api.getResumeChain(sessionId).then(setChain).catch(() => {});
  }, [sessionId]);

  if (chain.length < 2) return null;

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Conversation Thread</Typography>
      <Stack spacing={0.5}>
        {chain.map((s, i) => (
          <Stack
            key={s.id}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              cursor: s.id !== sessionId ? "pointer" : undefined,
              opacity: s.id === sessionId ? 1 : 0.7,
              "&:hover": s.id !== sessionId ? { opacity: 1 } : undefined,
            }}
            onClick={() => s.id !== sessionId && navigate(`/sessions/${s.id}`)}
          >
            <Typography variant="caption" color="text.disabled" sx={{ minWidth: 16 }}>
              {i + 1}.
            </Typography>
            <Typography variant="body2" fontWeight={s.id === sessionId ? 600 : 400}>
              {labelForCommand(s.command)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{formatTime(s.startedAt)}</Typography>
            {s.id === sessionId && <Chip label="current" size="small" variant="outlined" />}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function FileLinks({ sessionId, hasAnalysis }: { sessionId: string; hasAnalysis: boolean }) {
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Download raw JSONL log">
        <IconButton size="small" component="a" href={`/api/session-logs/${sessionId}/stream`} target="_blank" rel="noopener">
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {hasAnalysis && (
        <Tooltip title="View analysis JSON">
          <IconButton size="small" component="a" href={`/api/session-logs/${sessionId}/analysis`} target="_blank" rel="noopener">
            <DescriptionOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

function ResumeActions({
  session,
  onResume,
}: {
  session: SessionLogMeta;
  onResume: (fork: boolean) => void;
}) {
  if (!session.resumable) return null;
  const label = session.agentType === "codex" ? "Codex"
    : session.agentType === "gemini" ? "Gemini"
    : "Claude";

  return (
    <ButtonGroup size="small" variant="outlined">
      <Tooltip title={`Resume this ${label} conversation`}>
        <Button startIcon={<PlayArrowIcon />} onClick={() => onResume(false)}>
          Resume
        </Button>
      </Tooltip>
      <Tooltip title="Fork into a new conversation branch">
        <Button startIcon={<CallSplitIcon />} onClick={() => onResume(true)}>
          Fork
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

function DetailContent({
  session,
  analysis,
  analyzing,
  onAnalyze,
}: {
  session: SessionLogMeta;
  analysis: SessionLogAnalysis | null;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [streaming, setStreaming] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [viewMode, setViewMode] = useState<"pretty" | "raw">("pretty");
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, loading: messagesLoading } = useSessionMessages(
    viewMode === "pretty" ? session.id : null,
  );

  const handleResume = useCallback(async (fork: boolean) => {
    setResuming(true);
    try {
      await api.resumeSession(session.id, fork);
    } catch { /* terminal will open via channel event */ }
    setResuming(false);
  }, [session.id]);

  useEffect(() => {
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
    api.streamSessionLog(session.id, (entry) => {
      if (entry.type === "output" && entry.data) term.write(entry.data);
      else if (entry.type === "exited") term.write(`\r\n\x1b[90m[exited ${entry.exitCode ?? "?"}]\x1b[0m\r\n`);
    }, abort.signal)
      .then(() => term.scrollToTop())
      .catch(() => { if (!abort.signal.aborted) term.write("\x1b[31m[load failed]\x1b[0m\r\n"); })
      .finally(() => setStreaming(false));
    return () => { abort.abort(); observer.disconnect(); term.dispose(); };
  }, [session.id, theme]);

  const agentLabel = session.agentType
    ? session.agentType.charAt(0).toUpperCase() + session.agentType.slice(1)
    : null;

  return (
    <PageLayout
      fill
      title={labelForCommand(session.command)}
      icon={<IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>}
      badge={
        <>
          {agentLabel && <Chip label={agentLabel} size="small" variant="outlined" color="primary" />}
          {session.resumable && <Chip label="resumable" size="small" color="success" variant="outlined" />}
          {(session.resumeCount ?? 0) > 0 && (
            <Chip label={`resumed ${session.resumeCount}x`} size="small" variant="outlined" />
          )}
          <Chip label={formatTime(session.startedAt)} size="small" variant="outlined" />
          {session.exitCode !== undefined && (
            <Chip label={`exit ${session.exitCode}`} size="small" color={session.exitCode === 0 ? "success" : "error"} />
          )}
        </>
      }
      actions={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <ButtonGroup size="small" variant="outlined">
            <Button
              startIcon={<ChatIcon />}
              variant={viewMode === "pretty" ? "contained" : "outlined"}
              onClick={() => setViewMode("pretty")}
            >
              Pretty
            </Button>
            <Button
              startIcon={<TerminalIcon />}
              variant={viewMode === "raw" ? "contained" : "outlined"}
              onClick={() => setViewMode("raw")}
            >
              Raw
            </Button>
          </ButtonGroup>
          <ResumeActions session={session} onResume={handleResume} />
          {resuming && <CircularProgress size={16} />}
          {session.exitCode === undefined && (
            <Tooltip title="Focus this session in the terminal drawer">
              <Button
                size="small"
                variant="outlined"
                startIcon={<TerminalIcon />}
                onClick={() => requestTerminalOpen(session.id, labelForCommand(session.command))}
              >
                Focus
              </Button>
            </Tooltip>
          )}
          <Button
            size="small"
            variant={analysis ? "text" : "outlined"}
            startIcon={analyzing ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
            disabled={analyzing}
            onClick={onAnalyze}
          >
            {analysis ? "Re-analyze" : "Analyze"}
          </Button>
          <FileLinks sessionId={session.id} hasAnalysis={!!analysis} />
        </Stack>
      }
    >
      {session.summary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, ml: 6, fontStyle: "italic" }}>
          {session.summary}
        </Typography>
      )}
      {session.cwd && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ml: 6 }}>{session.cwd}</Typography>
      )}
      {analysis && <AnalysisPanel analysis={analysis} />}
      <ResumeChain sessionId={session.id} />
      {viewMode === "raw" ? (
        <>
          {streaming && <LinearProgress sx={{ mb: 0.5, borderRadius: 1, flexShrink: 0 }} />}
          <Box
            ref={containerRef}
            sx={{
              flex: 1, minHeight: 0, borderRadius: 1, overflow: "hidden",
              border: 1, borderColor: "warning.main", opacity: 0.85,
              "& .xterm": { height: "100%", p: 0.5 },
            }}
          />
        </>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
          {messagesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={20} />
            </Box>
          ) : messages.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
              No parsed messages available. Try Raw view.
            </Typography>
          ) : (
            <ChatMessages messages={sessionMessagesToChat(messages)} fontSize={13} />
          )}
        </Box>
      )}
    </PageLayout>
  );
}

export default function SessionLogDetail({ sessionId: propId }: { sessionId?: string } = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const location = useLocation();
  const [session, setSession] = useState<SessionLogMeta | null>(null);
  const [analysis, setAnalysis] = useState<SessionLogAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    const passed = (location.state as { session?: SessionLogMeta } | null)?.session;
    if (passed?.id === id) {
      setSession(passed);
      setAnalysis(passed.analysis ?? null);
      setLoading(false);
      return;
    }
    setSession(null);
    setAnalysis(null);
    setLoading(true);
    // Try fetching the specific session, fall back to list scan
    api.getSessionLog(id)
      .then(() => {
        // Session exists -- build a minimal meta from the list endpoint
        return api.listSessionLogs().then((list) => {
          const match = list.find((s) => s.id === id) ?? null;
          setSession(match);
          if (match?.analysis) setAnalysis(match.analysis);
        });
      })
      .catch(() => {
        // Session might still be in the list even if direct fetch failed
        api.listSessionLogs()
          .then((list) => {
            const match = list.find((s) => s.id === id) ?? null;
            setSession(match);
            if (match?.analysis) setAnalysis(match.analysis);
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = useCallback(async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeSessionLog(id);
      setAnalysis(result);
    } catch { toast.error("Failed to analyze session log"); }
    setAnalyzing(false);
  }, [id]);

  if (loading) {
    return (
      <PageLayout>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
      </PageLayout>
    );
  }
  if (!session) {
    return <PageLayout><Alert severity="warning">Session log not found.</Alert></PageLayout>;
  }
  return <DetailContent session={session} analysis={analysis} analyzing={analyzing} onAnalyze={handleAnalyze} />;
}
