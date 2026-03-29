import { useCallback, useState } from "react";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { keyframes } from "@mui/system";
import { api } from "../../lib/api";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export type SessionCategory =
  | "coding"
  | "testing"
  | "debugging"
  | "reviewing"
  | "deploying"
  | "researching"
  | "configuring"
  | "building"
  | "idle"
  | "shell"
  | "unknown";

export interface SessionProfile {
  id: string;
  category: SessionCategory;
  color: string;
  one_liner: string;
  doing: string;
  last_did: string;
  agent_type: string;
  state: string;
  profiled_at: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function formatAge(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

interface Props {
  profile?: SessionProfile;
  label: string;
  sessionId?: string;
  lastAiUpdate?: number;
  summary?: string;
  onSync?: (updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
}

export function ProfileTooltip({ profile, label, sessionId, lastAiUpdate, summary, onSync }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [sessionId]);

  const handleSync = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncing || !sessionId) return;
    setSyncing(true);
    try {
      const result = await api.syncTerminalAi(sessionId);
      const updates: { label?: string; summary?: string; lastAiUpdate?: number } = {};
      if (result.label) updates.label = result.label;
      if (result.summary) updates.summary = result.summary;
      if (updates.label || updates.summary) updates.lastAiUpdate = Date.now();
      onSync?.(updates);
    } catch { /* sync failed */ }
    setSyncing(false);
  }, [sessionId, syncing, onSync]);

  const age = lastAiUpdate ? Date.now() - lastAiUpdate : null;
  const hasAiStatus = sessionId !== undefined;

  if (!profile && !hasAiStatus) return <>{label}</>;

  return (
    <Box sx={{ maxWidth: 320, p: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      {sessionId && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
          <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.6rem", fontFamily: "monospace", flex: 1 }}>
            {sessionId}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy ID"} placement="right">
            <IconButton size="small" onClick={handleCopyId} sx={{ p: 0.25, color: "text.disabled" }}>
              {copied
                ? <CheckIcon sx={{ fontSize: 11, color: "success.main" }} />
                : <ContentCopyIcon sx={{ fontSize: 11 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {profile?.doing && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            What it does:
          </Typography>
          <Typography variant="caption">{profile.doing}</Typography>
        </Box>
      )}

      {profile?.last_did && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            Last action:
          </Typography>
          <Typography variant="caption">{profile.last_did}</Typography>
        </Box>
      )}

      {summary && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            Summary:
          </Typography>
          <Typography variant="caption">{summary}</Typography>
        </Box>
      )}

      <Box sx={{ mt: 0.5, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        {profile && (
          <>
            <Chip
              label={profile.category}
              size="small"
              sx={{
                height: 16,
                fontSize: "0.6rem",
                bgcolor: `${profile.color}33`,
                color: profile.color,
                "& .MuiChip-label": { px: 0.5 },
              }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
              {timeAgo(profile.profiled_at)}
            </Typography>
          </>
        )}
        {hasAiStatus && age !== null && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
            AI {formatAge(age)}
          </Typography>
        )}
        {hasAiStatus && (
          <IconButton
            size="small"
            onClick={handleSync}
            sx={{ p: 0.25, color: "inherit" }}
          >
            <SyncIcon sx={{
              fontSize: 12,
              animation: syncing ? `${spin} 0.8s linear infinite` : "none",
            }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
