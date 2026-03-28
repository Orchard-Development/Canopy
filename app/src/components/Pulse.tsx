import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  keyframes,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useDashboardChannel } from "../hooks/useDashboardChannel";
import { useChannelEvent, useChannelEventBuffer } from "../hooks/useChannelEvent";
import { EVENTS } from "../lib/events";

interface ProfilerStatus {
  phase: "idle" | "scanning" | "analyzing" | "synthesizing";
  detail: string;
  timestamp: string;
}

interface ProfilerActivity {
  action: string;
  timestamp: string;
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const PHASE_LABELS: Record<string, string> = {
  idle: "Watching",
  scanning: "Scanning",
  analyzing: "Analyzing",
  synthesizing: "Synthesizing",
};

export function Pulse() {
  const [expanded, setExpanded] = useState(false);
  const { channel } = useDashboardChannel();
  const status = useChannelEvent<ProfilerStatus>(channel, EVENTS.profiler.status);
  const activities = useChannelEventBuffer<ProfilerActivity>(channel, EVENTS.profiler.activity, 10);

  const phase = status?.phase ?? "idle";
  const isActive = phase !== "idle";
  const label = status?.detail ?? "Profiler inactive";
  const shortLabel = PHASE_LABELS[phase] ?? phase;

  return (
    <Box sx={{ position: "relative" }}>
      <Chip
        size="small"
        icon={
          <FiberManualRecordIcon
            sx={{
              fontSize: 10,
              color: isActive ? "success.main" : "text.disabled",
              animation: isActive ? `${pulse} 1.5s ease-in-out infinite` : "none",
            }}
          />
        }
        label={shortLabel}
        variant="outlined"
        onClick={() => setExpanded((p) => !p)}
        sx={{
          cursor: "pointer",
          fontSize: "0.7rem",
          height: 26,
          borderColor: isActive ? "success.main" : "divider",
          "& .MuiChip-label": { px: 0.75 },
        }}
      />
      <Collapse in={expanded}>
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            right: 0,
            mt: 1,
            width: 280,
            maxHeight: 260,
            overflow: "auto",
            p: 1.5,
            zIndex: 1300,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          {activities.length > 0 ? (
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {[...activities].reverse().map((a, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={a.action}
                    secondary={new Date(a.timestamp).toLocaleTimeString()}
                    primaryTypographyProps={{ variant: "caption" }}
                    secondaryTypographyProps={{ variant: "caption", fontSize: "0.65rem" }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
              No recent activity
            </Typography>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
