import { forwardRef, useCallback, useRef, useState } from "react";
import { Box, Card, CardContent, IconButton, Typography, Chip, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { api } from "../../lib/api";
import { requestTerminalOpen } from "../../hooks/useDispatch";
import { SessionStateDot } from "./SessionStateDot";
import { ProfileTooltip, type SessionProfile } from "./ProfileTooltip";
import { TerminalPanel } from "./TerminalPanel";
import type { TerminalTab } from "./TerminalDrawerContent";

interface Props {
  tab: TerminalTab;
  profile?: SessionProfile;
  colSpan: number;
  rowSpan: number;
  isDragging?: boolean;
  onResizeStart: (el: HTMLElement, e: React.MouseEvent, edge?: "left" | "right") => void;
  onReorderStart: (el: HTMLElement, e: React.MouseEvent) => void;
  onExpand: () => void;
  onCardClick?: () => void;
  onKill: () => void;
  onExit: (code: number) => void;
  onViewLog?: () => void;
  onOpenLogFile?: () => void;
  onAiSync?: (id: string, updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
  externalRefreshKey?: number;
}

export const TerminalCard = forwardRef(function TerminalCard(
  { tab, profile, colSpan, rowSpan, isDragging, onResizeStart, onReorderStart, onExpand, onCardClick, onKill, onExit, onViewLog, onOpenLogFile, onAiSync, externalRefreshKey }: Props,
  forwardedRef: React.ForwardedRef<HTMLElement>,
) {
  const [refreshKey, setRefreshKey] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useCallback((el: HTMLDivElement | null) => {
    cardRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = el;
  }, [forwardedRef]);
  const [forking, setForking] = useState(false);
  const handleFork = useCallback(async () => {
    if (forking) return;
    setForking(true);
    try {
      const result = await api.forkTerminal(tab.id);
      requestTerminalOpen(result.id, `Fork: ${tab.label || "session"}`, { forkedFrom: tab.id });
    } catch { /* fork failed */ }
    setForking(false);
  }, [tab.id, tab.label, forking]);
  const label = tab.label || tab.command || "Terminal";
  const resolvedState = tab.exitCode !== undefined ? "idle" as const : (tab.state ?? "running" as const);

  return (
    <Card
      ref={mergedRef}
      variant="outlined"
      onClick={onCardClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        height: "100%",
        transition: "opacity 150ms ease, transform 150ms ease, box-shadow 150ms ease",
        ...(tab.forkedFrom ? {
          backgroundColor: "#00bcd40a",
          borderLeft: "3px solid #00bcd4",
        } : profile?.color ? {
          backgroundColor: `${profile.color}14`,
          borderLeft: `3px solid ${profile.color}`,
        } : {}),
        ...(tab.node && tab.exitCode !== undefined && {
          opacity: 0.5,
        }),
        ...(isDragging && {
          opacity: 0.5,
          transform: "scale(0.97)",
          boxShadow: 6,
          zIndex: 10,
        }),
      }}
    >
      <Box
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          cardRef.current && onReorderStart(cardRef.current, e);
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 40,
          cursor: "grab",
        }}
      >
        <SessionStateDot state={resolvedState} size={8} />
        <Tooltip title={<ProfileTooltip profile={profile} label={label} sessionId={tab.id} lastAiUpdate={tab.lastAiUpdate} summary={tab.summary} onSync={(u) => onAiSync?.(tab.id, u)} />} enterDelay={300} placement="bottom-start">
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
        </Tooltip>
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
        {(() => {
          const cmd = tab.command.toLowerCase();
          const isAgent = cmd.includes("claude") || cmd.includes("codex");
          if (!isAgent) return null;
          return (
            <Tooltip title={tab.poker ? "Disable poker" : "Enable poker -- AI auto-continues after inactivity"}>
              <IconButton
                size="small"
                onClick={() => api.setPoker(tab.id, !tab.poker).catch(() => {})}
                sx={{
                  p: 0.5,
                  color: tab.poker ? "warning.main" : "action.disabled",
                  animation: tab.lastPokerFired && Date.now() - tab.lastPokerFired < 2000
                    ? "poker-pulse 1s ease-in-out"
                    : "none",
                  "@keyframes poker-pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 },
                  },
                }}
              >
                <AutoFixHighIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        })()}
        {(() => {
          const cmd = tab.command.toLowerCase();
          const isAgent = cmd.includes("claude") || cmd.includes("codex");
          if (!isAgent) return null;
          return (
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
          );
        })()}
        <Tooltip title="Refresh terminal">
          <IconButton size="small" onClick={() => setRefreshKey((k) => k + 1)} sx={{ p: 0.5 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onExpand} sx={{ p: 0.5 }}>
          <OpenInFullIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onKill} sx={{ p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      {(tab.cwd || tab.startedAt || tab.summary) && (
        <Box sx={{
          display: "flex",
          flexDirection: "column",
          px: 1.5,
          py: 0.25,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 22 }}>
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
                  {(() => {
                    const ms = Date.now() - new Date(tab.startedAt).getTime();
                    const s = Math.floor(ms / 1000);
                    if (s < 60) return `${s}s`;
                    const m = Math.floor(s / 60);
                    if (m < 60) return `${m}m`;
                    const h = Math.floor(m / 60);
                    return `${h}h ${m % 60}m`;
                  })()}
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
                  bgcolor: {
                    "worker:proposer": "#7c4dff",
                    "worker:reviewer": "#00bfa5",
                    "worker:extractor": "#ff6d00",
                    "worker:cluster_analyzer": "#448aff",
                  }[tab.source] ?? "#9e9e9e",
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
            {onViewLog && (
              <Tooltip title="View session transcript">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onViewLog(); }} sx={{ p: 0.25, flexShrink: 0 }}>
                  <ArticleOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
            {onOpenLogFile && (
              <Tooltip title="Open log file">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpenLogFile(); }} sx={{ p: 0.25, flexShrink: 0 }}>
                  <FolderOpenIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {tab.lastPrompt && (
            <Tooltip title={tab.lastPrompt}>
              <Typography variant="caption" noWrap sx={{
                fontSize: 10,
                color: "text.primary",
                pb: 0.25,
              }}>
                &gt; {tab.lastPrompt}
              </Typography>
            </Tooltip>
          )}
          {tab.summary && (
            <Tooltip title={tab.summary}>
              <Typography variant="caption" noWrap sx={{
                fontSize: 10,
                color: "text.secondary",
                fontStyle: "italic",
                pb: 0.25,
              }}>
                {tab.summary}
              </Typography>
            </Tooltip>
          )}
        </Box>
      )}
      <CardContent sx={{ flex: 1, p: 0, "&:last-child": { pb: 0 }, overflow: "hidden" }}>
        <TerminalPanel key={`${tab.id}-${refreshKey}-${externalRefreshKey || 0}`} sessionId={tab.id} active onExit={onExit} />
      </CardContent>
      {/* Left edge drag-to-reorder handle */}
      <Box
        onMouseDown={(e) => cardRef.current && onReorderStart(cardRef.current, e)}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 14,
          height: "100%",
          cursor: "grab",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          opacity: 0,
          "&:hover": { opacity: 0.6, bgcolor: "action.hover" },
        }}
      >
        <svg width="6" height="20" viewBox="0 0 6 20">
          {[3, 7, 11, 13, 17].map((y) => (
            <g key={y}>
              <circle cx="1.5" cy={y} r="1" fill="currentColor" />
              <circle cx="4.5" cy={y} r="1" fill="currentColor" />
            </g>
          ))}
        </svg>
      </Box>
      {/* Left corner resize grip */}
      <Box
        onMouseDown={(e) => cardRef.current && onResizeStart(cardRef.current, e, "left")}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 20,
          height: 20,
          cursor: "nesw-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          opacity: 0.3,
          "&:hover": { opacity: 0.8 },
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" />
          <line x1="1" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Box>
      {/* Right corner resize grip */}
      <Box
        onMouseDown={(e) => cardRef.current && onResizeStart(cardRef.current, e, "right")}
        sx={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 20,
          height: 20,
          cursor: "nwse-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          opacity: 0.3,
          "&:hover": { opacity: 0.8 },
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" />
          <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Box>
    </Card>
  );
});
