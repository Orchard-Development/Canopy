import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import BuildIcon from "@mui/icons-material/Build";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
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

interface RichAnalysis {
  status: string;
  detail: string;
  label?: string;
  summary?: string;
  actionNeeded?: boolean;
  ts: string;
  // Rich fields from the AI analysis
  outcome?: string;
  filesChanged?: string[];
  toolsUsed?: string[];
  keyDecisions?: string[];
}

function OutcomeChip({ outcome }: { outcome?: string }) {
  if (!outcome) return null;
  const color = outcome === "success" ? "success" as const
    : outcome === "failure" ? "error" as const
    : "warning" as const;
  const icon = outcome === "success" ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
    : outcome === "failure" ? <ErrorOutlineIcon sx={{ fontSize: 14 }} />
    : <RemoveCircleOutlineIcon sx={{ fontSize: 14 }} />;
  return <Chip icon={icon} label={outcome} size="small" color={color} variant="outlined" sx={{ height: 24, fontSize: 12 }} />;
}

function AnalysisPanel({ analysis, rich }: { analysis: SessionLogAnalysis; rich?: RichAnalysis }) {
  const files = rich?.filesChanged ?? [];
  const tools = rich?.toolsUsed ?? [];
  const decisions = rich?.keyDecisions ?? [];

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <AutoFixHighIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="subtitle2">Analysis</Typography>
        <Chip label={analysis.status} size="small" color={statusColor(analysis.status)} />
        {analysis.actionNeeded && <Chip label="action needed" size="small" color="warning" />}
        <OutcomeChip outcome={rich?.outcome} />
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled">
          {formatTime(analysis.ts)}
        </Typography>
      </Stack>

      {/* Summary */}
      {(rich?.summary || analysis.summary) && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {rich?.summary || analysis.summary}
        </Typography>
      )}

      {/* Detail */}
      {analysis.detail && analysis.detail !== analysis.summary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {analysis.detail}
        </Typography>
      )}

      {/* Key decisions */}
      {decisions.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <LightbulbOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" fontWeight={600} color="text.secondary">Decisions</Typography>
          </Stack>
          {decisions.map((d, i) => (
            <Typography key={i} variant="caption" color="text.secondary" sx={{ display: "block", ml: 2.5, lineHeight: 1.5 }}>
              {d}
            </Typography>
          ))}
        </Box>
      )}

      {/* Files + Tools row */}
      {(files.length > 0 || tools.length > 0) && (
        <Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
          {files.length > 0 && (
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Files ({files.length})
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {files.slice(0, 8).map((f, i) => (
                  <Chip
                    key={i}
                    label={f.split("/").pop()}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11, fontFamily: "monospace" }}
                  />
                ))}
                {files.length > 8 && (
                  <Chip label={`+${files.length - 8}`} size="small" sx={{ height: 20, fontSize: 11 }} />
                )}
              </Stack>
            </Box>
          )}
          {tools.length > 0 && (
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                <BuildIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Tools ({tools.length})
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {tools.slice(0, 6).map((t, i) => (
                  <Chip key={i} label={t} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                ))}
                {tools.length > 6 && (
                  <Chip label={`+${tools.length - 6}`} size="small" sx={{ height: 20, fontSize: 11 }} />
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
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
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1.5 }}>
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
  richAnalysis,
  analyzing,
  onAnalyze,
  peerNode,
}: {
  session: SessionLogMeta;
  analysis: SessionLogAnalysis | null;
  richAnalysis: RichAnalysis | null;
  analyzing: boolean;
  onAnalyze: () => void;
  peerNode?: string;
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [streaming, setStreaming] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [viewMode, setViewMode] = useState<"pretty" | "raw">("pretty");
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, loading: messagesLoading } = useSessionMessages(
    viewMode === "pretty" && session.hasMessages !== false ? session.id : null,
    0,
    peerNode,
  );

  const handleResume = useCallback(async (fork: boolean) => {
    setResuming(true);
    try {
      const result = await api.resumeSession(session.id, fork);
      requestTerminalOpen(result.id, labelForCommand(result.command));
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
    setResuming(false);
  }, [session.id, session.label, session.command]);

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
    const streamUrl = peerNode
      ? `/api/mesh/collab/relay/${encodeURIComponent(peerNode)}/${session.id}/stream`
      : undefined;
    const doStream = streamUrl
      ? async () => {
          const res = await fetch(streamUrl, { signal: abort.signal });
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
              } catch { /* skip */ }
            }
          }
          term.scrollToTop();
        }
      : () => api.streamSessionLog(session.id, (entry) => {
          if (entry.type === "output" && entry.data) term.write(entry.data);
          else if (entry.type === "exited") term.write(`\r\n\x1b[90m[exited ${entry.exitCode ?? "?"}]\x1b[0m\r\n`);
        }, abort.signal).then(() => term.scrollToTop());
    doStream()
      .catch(() => { if (!abort.signal.aborted) term.write("\x1b[31m[load failed]\x1b[0m\r\n"); })
      .finally(() => setStreaming(false));
    return () => { abort.abort(); observer.disconnect(); term.dispose(); };
  }, [session.id, theme, peerNode]);

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
          {peerNode && <Chip label={`Remote — ${session.peer_machine_id || session.peer_display_name || "peer"}`} size="small" variant="outlined" sx={{ borderColor: "#9c27b0", color: "#9c27b0" }} />}
          {agentLabel && <Chip label={agentLabel} size="small" variant="outlined" color="primary" />}
          {!peerNode && session.resumable && <Chip label="resumable" size="small" color="success" variant="outlined" />}
          {(session.resumeCount ?? 0) > 0 && (
            <Chip label={`resumed ${session.resumeCount}x`} size="small" variant="outlined" />
          )}
          <Chip label={formatTime(session.startedAt)} size="small" variant="outlined" />
          <Chip
            label={session.exitCode === undefined ? "running" : "ended"}
            size="small"
            variant="outlined"
            sx={session.exitCode === undefined ? { color: "success.main", borderColor: "success.main" } : { color: "text.secondary", borderColor: "divider" }}
          />
        </>
      }
      actions={
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
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
      {/* Summary + CWD */}
      {(session.summary || session.cwd) && (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1.5 }}>
          {session.summary && (
            <Typography variant="body2" sx={{ fontStyle: "italic", mb: session.cwd ? 0.5 : 0 }}>
              {session.summary}
            </Typography>
          )}
          {session.cwd && (
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
              {session.cwd}
            </Typography>
          )}
        </Paper>
      )}

      {analysis && <AnalysisPanel analysis={analysis} rich={richAnalysis ?? undefined} />}
      <ResumeChain sessionId={session.id} />

      {viewMode === "raw" ? (
        <>
          {streaming && <LinearProgress sx={{ mb: 0.5, borderRadius: 1, flexShrink: 0 }} />}
          <Box
            ref={containerRef}
            sx={{
              flex: 1, minHeight: 0, borderRadius: 1, overflow: "hidden",
              border: 1, borderColor: "divider",
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
  const [searchParams] = useSearchParams();
  const id = propId || paramId;
  const peerNode = searchParams.get("peer") || undefined;
  const location = useLocation();
  const [session, setSession] = useState<SessionLogMeta | null>(null);
  const [analysis, setAnalysis] = useState<SessionLogAnalysis | null>(null);
  const [richAnalysis, setRichAnalysis] = useState<RichAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    const passed = (location.state as { session?: SessionLogMeta } | null)?.session;
    const fetchRichAnalysis = () => {
      fetch(`/api/session-logs/${id}/analysis`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          const a = data.analysis ?? data;
          setRichAnalysis({
            status: analysis?.status ?? a.outcome ?? "unknown",
            detail: analysis?.detail ?? a.summary ?? "",
            ts: data.analyzedAt ?? new Date().toISOString(),
            summary: a.summary,
            outcome: a.outcome,
            filesChanged: a.files_changed,
            toolsUsed: a.tools_used,
            keyDecisions: a.key_decisions,
          });
          // Also set basic analysis if not already set
          if (!analysis) {
            setAnalysis({
              status: a.outcome ?? "analyzed",
              detail: a.summary ?? "",
              ts: data.analyzedAt ?? new Date().toISOString(),
            });
          }
        })
        .catch(() => {});
    };

    if (passed?.id === id) {
      setSession(passed);
      setAnalysis(passed.analysis ?? null);
      setLoading(false);
      if (passed.hasMessages !== false) fetchRichAnalysis();
    } else if (peerNode && id) {
      // Remote session — fetch metadata via relay
      setSession(null);
      setAnalysis(null);
      setRichAnalysis(null);
      setLoading(true);
      api.getRemoteSessionLog(peerNode, id).then((data) => {
        const meta: SessionLogMeta = {
          id: id!,
          lineCount: 0,
          sizeBytes: 0,
          peer_node: peerNode,
          ...data as Record<string, unknown>,
        } as SessionLogMeta;
        setSession(meta);
      }).catch(() => {
        // Fallback: create a minimal session object
        setSession({ id: id!, lineCount: 0, sizeBytes: 0, peer_node: peerNode, command: "claude", agentType: "claude" });
      }).finally(() => setLoading(false));
    } else {
      setSession(null);
      setAnalysis(null);
      setRichAnalysis(null);
      setLoading(true);
      api.listSessionLogs().then((list) => {
        const match = list.find((s) => s.id === id) ?? null;
        setSession(match);
        if (match?.analysis) setAnalysis(match.analysis);
        if (match?.hasMessages !== false) fetchRichAnalysis();
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [id, peerNode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = useCallback(async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeSessionLog(id);
      setAnalysis(result);
      // Also try to get the rich analysis
      const rich = (result as any).analysis ?? result;
      setRichAnalysis({
        status: result.status,
        detail: result.detail,
        ts: result.ts,
        summary: rich.summary,
        outcome: rich.outcome,
        filesChanged: rich.files_changed,
        toolsUsed: rich.tools_used,
        keyDecisions: rich.key_decisions,
      });
    } catch { toast.error("Failed to analyze session log"); }
    setAnalyzing(false);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <PageLayout>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={300} />
      </PageLayout>
    );
  }
  if (!session) {
    return <PageLayout><Alert severity="warning">Session log not found.</Alert></PageLayout>;
  }
  return (
    <DetailContent
      session={session}
      analysis={analysis}
      richAnalysis={richAnalysis}
      analyzing={analyzing}
      onAnalyze={handleAnalyze}
      peerNode={peerNode}
    />
  );
}
