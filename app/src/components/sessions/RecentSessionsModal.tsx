import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardActionArea, CardContent,
  Typography, Box, Stack, Chip, Skeleton, Button, alpha,
  IconButton, Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import HistoryIcon from "@mui/icons-material/History";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { api, type SessionLogMeta } from "../../lib/api";
import { labelForCommand } from "../../lib/session-log-utils";
import { requestTerminalOpen } from "../../hooks/useDispatch";
import { timeAgo } from "../../lib/time";

const SESSION_KEY = "orchard:recent-sessions-shown";
const MAX_CARDS = 8;

interface SessionEnrichment {
  firstPrompt?: string;
}

type EnrichmentMap = Record<string, SessionEnrichment>;

function agentLabel(agentType?: string): string {
  const labels: Record<string, string> = {
    claude: "Claude", codex: "Codex", cursor: "Cursor",
    gemini: "Gemini", aider: "Aider", opencode: "OpenCode", claw_code: "Claw Code",
  };
  return labels[agentType ?? ""] ?? agentType ?? "";
}

function statusDotColor(s: SessionLogMeta): string {
  if (s.exitCode === undefined) return "success.main";
  return "text.disabled";
}

function SessionCard({
  session, enrichment, onClick,
}: {
  session: SessionLogMeta;
  enrichment?: SessionEnrichment;
  onClick: () => void;
}) {
  const isRunning = session.exitCode === undefined;
  const summary = session.summary;
  const firstPrompt = enrichment?.firstPrompt;

  return (
    <Card variant="outlined" sx={{ flex: "0 0 auto" }}>
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
          {/* Header row */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: 8, color: statusDotColor(session) }} />
            <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
              {session.label || labelForCommand(session.command)}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
              {session.startedAt ? timeAgo(session.startedAt) : ""}
            </Typography>
          </Stack>

          {/* What was asked */}
          {firstPrompt && (
            <Typography
              variant="caption"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.4,
                mb: 0.5,
                fontStyle: "italic",
                color: "text.secondary",
              }}
            >
              {firstPrompt}
            </Typography>
          )}

          {/* What was accomplished */}
          {summary && (
            <Typography
              variant="caption"
              color="text.primary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.4,
                mb: 0.5,
              }}
            >
              {summary}
            </Typography>
          )}

          {/* Chips */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {session.agentType && (
              <Chip label={agentLabel(session.agentType)} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}
            {isRunning && (
              <Chip label="running" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}
            {session.resumable && (
              <Chip label="resumable" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            )}
            {session.profile?.category && session.profile.category !== "unknown" && (
              <Chip
                label={session.profile.category}
                size="small"
                variant="outlined"
                sx={{
                  height: 20, fontSize: 11, fontWeight: 600,
                  bgcolor: session.profile.color ? alpha(session.profile.color, 0.15) : undefined,
                  color: session.profile.color || "text.secondary",
                }}
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Stack spacing={1.5}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={100} />
      ))}
    </Stack>
  );
}

async function fetchEnrichment(id: string): Promise<SessionEnrichment> {
  const enrichment: SessionEnrichment = {};

  try {
    const messages = await api.getSessionMessages(id);
    if (messages) {
      const firstUser = messages.find((m: { role: string; text: string }) => m.role === "user");
      if (firstUser?.text) {
        enrichment.firstPrompt = firstUser.text.length > 200
          ? firstUser.text.slice(0, 200) + "..."
          : firstUser.text;
      }
    }
  } catch {
    // firstPrompt is optional -- skip if unavailable
  }

  return enrichment;
}

export function RecentSessionsModal({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionLogMeta[]>([]);
  const [enrichments, setEnrichments] = useState<EnrichmentMap>({});
  const [loading, setLoading] = useState(true);
  const enrichingRef = useRef(false);

  // Step 1: fetch session list
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    api.listSessionLogs()
      .then((all) => {
        const recent = all.slice(0, MAX_CARDS);
        if (recent.length > 0) {
          setSessions(recent);
          setOpen(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Step 2: enrich each session with messages + analysis (parallel, non-blocking)
  useEffect(() => {
    if (sessions.length === 0 || enrichingRef.current) return;
    enrichingRef.current = true;

    // Fetch enrichments in parallel, updating state as each resolves
    // Skip sessions without messages to avoid 404 floods
    sessions.filter((s) => s.hasMessages !== false).forEach((s) => {
      fetchEnrichment(s.id).then((data) => {
        setEnrichments((prev) => ({ ...prev, [s.id]: data }));
      }).catch(() => {});
    });
  }, [sessions]);

  const [resumingAll, setResumingAll] = useState(false);

  const resumableSessions = sessions.filter(
    (s) => s.resumable && s.exitCode !== undefined,
  );

  const handleClose = () => setOpen(false);

  const handleCardClick = (s: SessionLogMeta) => {
    setOpen(false);
    onNavigate(`/sessions/${s.id}`);
  };

  const handleResumeAll = async () => {
    if (resumableSessions.length === 0) return;
    setResumingAll(true);
    try {
      const results = await Promise.allSettled(
        resumableSessions.map((s) => api.resumeSession(s.id, false)),
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          requestTerminalOpen(result.value.id, labelForCommand(result.value.command));
        }
      }
      setOpen(false);
    } finally {
      setResumingAll(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(4px)" } },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon fontSize="small" color="primary" />
        <Typography variant="h6" component="span" fontWeight={600} sx={{ flex: 1 }}>
          Recent Sessions
        </Typography>
        <IconButton size="small" onClick={handleClose} sx={{ mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : sessions.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No recent sessions found.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                enrichment={enrichments[s.id]}
                onClick={() => handleCardClick(s)}
              />
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} size="small">Dismiss</Button>
        {resumableSessions.length > 0 && (
          <Button
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={handleResumeAll}
            disabled={resumingAll}
          >
            {resumingAll ? "Resuming..." : `Resume All (${resumableSessions.length})`}
          </Button>
        )}
        <Button
          variant="contained"
          size="small"
          onClick={() => { setOpen(false); onNavigate("/sessions"); }}
        >
          View All Sessions
        </Button>
      </DialogActions>
    </Dialog>
  );
}
