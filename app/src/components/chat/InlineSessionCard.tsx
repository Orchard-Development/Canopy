import { useState, useEffect, useCallback } from "react";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { PrettyTerminal } from "../terminal/PrettyTerminal";
import { useSessionChannel } from "../../hooks/useSessionChannel";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";
import { useChannelEvent } from "../../hooks/useChannelEvent";
import { requestTerminalOpen } from "../../hooks/useDispatch";

interface Props {
  sessionId: string;
  onExpand?: () => void;
}

export function InlineSessionCard({ sessionId, onExpand }: Props) {
  const theme = useTheme();
  const [state, setState] = useState<string>("running");
  const [collapsed, setCollapsed] = useState(false);

  const { channel: dashChannel } = useDashboardChannel();
  const stateEvent = useChannelEvent<{ id: string; state: string }>(dashChannel, "session:state");

  useEffect(() => {
    if (!stateEvent || stateEvent.id !== sessionId) return;
    setState(stateEvent.state);
    if (stateEvent.state === "exited") setCollapsed(true);
  }, [stateEvent, sessionId]);

  const { sendInput, info } = useSessionChannel(sessionId);

  const cwd = (info as Record<string, unknown> | null)?.cwd as string | undefined;
  const label = cwd
    ? cwd.replace(/^\/Users\/[^/]+/, "~")
    : sessionId.slice(0, 8);

  const handleSend = useCallback(
    (text: string) => {
      sendInput(text);
    },
    [sendInput],
  );

  const handleExpand = useCallback(() => {
    if (onExpand) {
      onExpand();
    } else {
      requestTerminalOpen(sessionId, "claude");
    }
  }, [onExpand, sessionId]);

  const isRunning = state === "running";
  const accentColor = isRunning
    ? theme.palette.primary.main
    : theme.palette.divider;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        ml: 0,
        borderRadius: 2,
        borderLeft: `3px solid ${accentColor}`,
        overflow: "hidden",
        transition: "border-color 0.3s",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          minHeight: 48,
          bgcolor: "action.hover",
          cursor: "pointer",
          borderBottom: collapsed ? 0 : 1,
          borderColor: "divider",
        }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <FiberManualRecordIcon
          sx={{
            fontSize: 10,
            color: isRunning ? "success.main" : "text.disabled",
            flexShrink: 0,
          }}
        />
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", fontSize: 12, fontWeight: 500, flex: 1 }}
        >
          claude{" "}
          <span style={{ opacity: 0.6, fontSize: 11 }}>{label}</span>
        </Typography>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleExpand(); }} title="Open in terminal" sx={{ p: 0.5 }}>
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </IconButton>
        {collapsed ? <ExpandMoreIcon sx={{ fontSize: 14, color: "text.disabled" }} /> : <ExpandLessIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
      </Box>

      {/* Body */}
      {!collapsed && (
        <Box sx={{ height: 320 }}>
          <PrettyTerminal sessionId={sessionId} onSend={handleSend} />
        </Box>
      )}
    </Paper>
  );
}
