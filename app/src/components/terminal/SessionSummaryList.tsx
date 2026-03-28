import { useCallback, useState } from "react";
import { Box, Card, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseIcon from "@mui/icons-material/Close";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import RefreshIcon from "@mui/icons-material/Refresh";
import SyncIcon from "@mui/icons-material/Sync";
import { keyframes } from "@mui/system";
import { api } from "../../lib/api";
import { requestTerminalOpen } from "../../hooks/useDispatch";
import { SessionStateDot } from "./SessionStateDot";
import type { TerminalTab } from "./TerminalDrawerContent";
import type { SessionProfile } from "./ProfileTooltip";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const WORKER_COLORS: Record<string, string> = {
  "worker:proposer": "#7c4dff",
  "worker:reviewer": "#00bfa5",
  "worker:extractor": "#ff6d00",
  "worker:cluster_analyzer": "#448aff",
};

function elapsed(startedAt?: string): string {
  if (!startedAt) return "";
  const ms = Date.now() - new Date(startedAt).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatAge(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

interface Props {
  tabs: TerminalTab[];
  profiles?: Record<string, SessionProfile>;
  onCardFocus?: (id: string) => void;
  onKill?: (index: number) => void;
  onViewLog?: (sessionId: string) => void;
  onOpenLogFile?: (sessionId: string) => void;
  onAiSync?: (id: string, updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
}

function SummaryCard({ tab, index, profile, onCardFocus, onKill, onViewLog, onOpenLogFile, onAiSync }: {
  tab: TerminalTab;
  index: number;
  profile?: SessionProfile;
  onCardFocus?: (id: string) => void;
  onKill?: (index: number) => void;
  onViewLog?: (sessionId: string) => void;
  onOpenLogFile?: (sessionId: string) => void;
  onAiSync?: (id: string, updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
}) {
  const [forking, setForking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const resolvedState = tab.exitCode !== undefined ? "idle" as const : (tab.state ?? "running" as const);
  const label = tab.label || tab.command || "Terminal";
  const isAgent = tab.command?.toLowerCase().includes("claude") || tab.command?.toLowerCase().includes("codex");
  const aiAge = tab.lastAiUpdate ? Date.now() - tab.lastAiUpdate : null;

  const handleFork = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (forking) return;
    setForking(true);
    try {
      const result = await api.forkTerminal(tab.id);
      requestTerminalOpen(result.id, `Fork: ${tab.label || "session"}`, { forkedFrom: tab.id });
    } catch { /* fork failed */ }
    setForking(false);
  }, [tab.id, tab.label, forking]);

  const handleSync = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await api.syncTerminalAi(tab.id);
      const updates: { label?: string; summary?: string; lastAiUpdate?: number } = {};
      if (result.label) updates.label = result.label;
      if (result.summary) updates.summary = result.summary;
      if (updates.label || updates.summary) updates.lastAiUpdate = Date.now();
      onAiSync?.(tab.id, updates);
    } catch { /* sync failed */ }
    setSyncing(false);
  }, [tab.id, syncing, onAiSync]);

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: "pointer",
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: "action.hover" },
        ...(tab.forkedFrom ? {
          backgroundColor: "#00bcd40a",
          borderLeft: "3px solid #00bcd4",
        } : profile?.color ? {
          backgroundColor: `${profile.color}14`,
          borderLeft: `3px solid ${profile.color}`,
        } : {}),
        ...(tab.exitCode !== undefined && tab.node ? { opacity: 0.5 } : {}),
      }}
      onClick={() => onCardFocus?.(tab.id)}
    >
      {/* Header: state dot, label, chips, action buttons */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderBottom: 1,
        borderColor: "divider",
        minHeight: 40,
      }}>
        <SessionStateDot state={resolvedState} size={8} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {label}
          </Typography>
          {profile?.one_liner && (
            <Typography variant="caption" noWrap sx={{ color: "text.secondary", lineHeight: 1.2, display: "block" }}>
              {profile.one_liner}
            </Typography>
          )}
        </Box>
        {tab.exitCode !== undefined && (
          <Chip
            size="small"
            label={tab.exitCode}
            color={tab.exitCode === 0 ? "success" : "error"}
            sx={{ height: 20, fontSize: 11, "& .MuiChip-label": { px: 0.75 } }}
          />
        )}
        {tab.node && (
          <Chip
            size="small"
            label={`@${tab.node.split("@")[0] || tab.node}`}
            sx={{
              height: 18,
              fontSize: 10,
              fontFamily: "monospace",
              "& .MuiChip-label": { px: 0.5 },
              bgcolor: "info.main",
              color: "info.contrastText",
            }}
          />
        )}
        {isAgent && (
          <Tooltip title={tab.poker ? "Disable poker" : "Enable poker -- AI auto-continues after inactivity"}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); api.setPoker(tab.id, !tab.poker).catch(() => {}); }}
              sx={{
                p: 0.5,
                color: tab.poker ? "warning.main" : "action.disabled",
                animation: tab.lastPokerFired && Date.now() - tab.lastPokerFired < 2000
                  ? "poker-pulse 1s ease-in-out" : "none",
                "@keyframes poker-pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
              }}
            >
              <AutoFixHighIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {isAgent && (
          <Tooltip title="Fork -- summarize and spawn a new agent">
            <IconButton
              size="small"
              onClick={handleFork}
              disabled={forking}
              sx={{ p: 0.5, opacity: forking ? 0.4 : 1 }}
            >
              <CallSplitIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onViewLog && (
          <Tooltip title="View session transcript">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onViewLog(tab.id); }} sx={{ p: 0.25 }}>
              <ArticleOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Focus terminal">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCardFocus?.(tab.id); }} sx={{ p: 0.25 }}>
            <OpenInFullIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onKill?.(index); }} sx={{ p: 0.25 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Info bar: cwd, elapsed, source chip, fork chip, agent type, log buttons */}
      <Box sx={{
        px: 1.5,
        py: 0.5,
        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 22, flexWrap: "wrap" }}>
          {tab.cwd && (
            <Tooltip title={tab.cwd}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: 1 }}>
                <FolderOutlinedIcon sx={{ fontSize: 12, color: "text.disabled", flexShrink: 0 }} />
                <Typography variant="caption" noWrap sx={{ fontSize: 10, color: "text.secondary" }}>
                  {tab.cwd.replace(/^\/Users\/[^/]+/, "~")}
                </Typography>
              </Box>
            </Tooltip>
          )}
          {tab.startedAt && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
              <AccessTimeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
              <Typography variant="caption" sx={{ fontSize: 10, color: "text.disabled" }}>
                {elapsed(tab.startedAt)}
              </Typography>
            </Box>
          )}
          {tab.source?.startsWith("worker:") && (
            <Chip
              size="small"
              label={tab.source.replace("worker:", "")}
              sx={{
                height: 16,
                fontSize: 9,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                "& .MuiChip-label": { px: 0.5 },
                bgcolor: WORKER_COLORS[tab.source] ?? "#9e9e9e",
                color: "#fff",
              }}
            />
          )}
          {tab.forkedFrom && (
            <Tooltip title={`Forked from ${tab.forkedFrom.slice(0, 8)}`}>
              <Chip
                size="small"
                label="FORK"
                onClick={(e) => {
                  e.stopPropagation();
                  requestTerminalOpen(tab.forkedFrom!, "Parent session");
                }}
                sx={{
                  height: 16,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  "& .MuiChip-label": { px: 0.5 },
                  bgcolor: "#00bcd4",
                  color: "#fff",
                  "&:hover": { bgcolor: "#0097a7" },
                }}
              />
            </Tooltip>
          )}
          {tab.agentType && tab.agentType !== "shell" && (
            <Chip
              size="small"
              label={tab.agentType}
              sx={{
                height: 16,
                fontSize: 9,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                "& .MuiChip-label": { px: 0.5 },
                bgcolor: "action.selected",
              }}
            />
          )}
          {onOpenLogFile && (
            <Tooltip title="Open log file">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenLogFile(tab.id); }} sx={{ p: 0.25, flexShrink: 0 }}>
                <FolderOpenIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Profile details: doing, last_did, category */}
        {profile?.doing && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 10 }}>
              Doing:{" "}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              {profile.doing}
            </Typography>
          </Box>
        )}
        {profile?.last_did && (
          <Box sx={{ mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 10 }}>
              Last:{" "}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              {profile.last_did}
            </Typography>
          </Box>
        )}

        {/* Last user prompt */}
        {tab.lastPrompt && (
          <Box sx={{ mt: 0.5, pl: 1, borderLeft: 2, borderColor: "primary.main" }}>
            <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 10, display: "block" }}>
              Last prompt:
            </Typography>
            <Typography variant="caption" sx={{
              fontSize: 11,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {tab.lastPrompt}
            </Typography>
          </Box>
        )}

        {/* Summary */}
        {tab.summary && (
          <Typography variant="caption" sx={{
            display: "block",
            mt: 0.5,
            fontSize: 11,
            color: "text.secondary",
            fontStyle: "italic",
            lineHeight: 1.4,
          }}>
            {tab.summary}
          </Typography>
        )}

        {/* Footer: category chip, profile age, AI age, sync button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
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
                profiled {formatAge(Date.now() - new Date(profile.profiled_at).getTime())}
              </Typography>
            </>
          )}
          {aiAge !== null && (
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
              AI {formatAge(aiAge)}
            </Typography>
          )}
          <Tooltip title="Sync AI label & summary">
            <IconButton size="small" onClick={handleSync} sx={{ p: 0.25, color: "text.secondary" }}>
              <SyncIcon sx={{
                fontSize: 12,
                animation: syncing ? `${spin} 0.8s linear infinite` : "none",
              }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
}

export function SessionSummaryList({ tabs, profiles, onCardFocus, onKill, onViewLog, onOpenLogFile, onAiSync }: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1, overflow: "auto", flex: 1 }}>
      {tabs.map((tab, index) => (
        <SummaryCard
          key={tab.id}
          tab={tab}
          index={index}
          profile={profiles?.[tab.id]}
          onCardFocus={onCardFocus}
          onKill={onKill}
          onViewLog={onViewLog}
          onOpenLogFile={onOpenLogFile}
          onAiSync={onAiSync}
        />
      ))}
    </Box>
  );
}
