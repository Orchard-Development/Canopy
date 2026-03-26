import { useState, useEffect, useCallback } from "react";
import { Tooltip, Typography, Stack, IconButton } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SyncIcon from "@mui/icons-material/Sync";
import { keyframes } from "@mui/system";
import { useChannel } from "../../hooks/useChannel";
import { useChannelEvent } from "../../hooks/useChannelEvent";
import { EVENTS } from "../../lib/events";
import { api } from "../../lib/api";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface Props {
  sessionId: string;
  lastAiUpdate?: number;
  label?: string;
  summary?: string;
  size?: number;
  onSync?: (updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
}

function formatAge(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function AiStatusIndicator({ sessionId, lastAiUpdate, label, summary, size = 14, onSync }: Props) {
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [, setTick] = useState(0);

  const [statusDetail, setStatusDetail] = useState<string | null>(null);

  const { channel } = useChannel("dashboard");
  const aiStatusEvent = useChannelEvent<{ status: string; detail?: string }>(channel, EVENTS.ai.status);

  useEffect(() => {
    if (!aiStatusEvent) return;
    setAiOnline(aiStatusEvent.status === "online");
    if (aiStatusEvent.detail) setStatusDetail(aiStatusEvent.detail);
  }, [aiStatusEvent]);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await api.syncTerminalAi(sessionId);
      const updates: { label?: string; summary?: string; lastAiUpdate?: number } = {};
      if (result.label) updates.label = result.label;
      if (result.summary) updates.summary = result.summary;
      if (updates.label || updates.summary) updates.lastAiUpdate = Date.now();
      if (result.error) setSyncError(result.error);
      onSync?.(updates);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    }
    setSyncing(false);
  }, [sessionId, syncing, onSync]);

  const age = lastAiUpdate ? Date.now() - lastAiUpdate : null;

  let color: string;
  let statusLine: string;
  let shouldPulse = false;

  if (aiOnline === false) {
    color = "#ef5350";
    statusLine = "AI service offline";
  } else if (age === null) {
    color = "#9e9e9e";
    statusLine = "No AI updates received";
  } else if (age < 120_000) {
    color = "#66bb6a";
    statusLine = `Active -- updated ${formatAge(age)}`;
    shouldPulse = true;
  } else {
    color = "#ffb74d";
    statusLine = `Stale -- last update ${formatAge(age)}`;
  }

  return (
    <Tooltip
      arrow
      title={
        <Stack spacing={0.5} sx={{ py: 0.25 }}>
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11 }}>
            AI Status
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11 }}>
            {statusLine}
          </Typography>
          {statusDetail && (
            <Typography variant="caption" sx={{ fontSize: 10, color: "text.disabled" }}>
              {statusDetail}
            </Typography>
          )}
          <Typography variant="caption" sx={{ fontSize: 11 }}>
            Label: {label || "pending..."}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, maxWidth: 240, whiteSpace: "normal" }}>
            Summary: {summary || "pending..."}
          </Typography>
          {syncError && (
            <Typography variant="caption" sx={{ fontSize: 10, color: "#ef5350", maxWidth: 240, whiteSpace: "normal" }}>
              {syncError}
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={handleSync}
            sx={{ alignSelf: "flex-start", p: 0.25, color: "inherit" }}
          >
            <SyncIcon sx={{
              fontSize: 14,
              animation: syncing ? `${spin} 0.8s linear infinite` : "none",
            }} />
            <Typography variant="caption" sx={{ fontSize: 10, ml: 0.5 }}>
              {syncing ? "Syncing..." : "Force sync"}
            </Typography>
          </IconButton>
        </Stack>
      }
    >
      <AutoAwesomeIcon
        onClick={handleSync}
        sx={{
          fontSize: size,
          color,
          cursor: "pointer",
          flexShrink: 0,
          animation: syncing
            ? `${spin} 0.8s linear infinite`
            : shouldPulse ? `${pulse} 2s ease-in-out infinite` : "none",
        }}
      />
    </Tooltip>
  );
}
