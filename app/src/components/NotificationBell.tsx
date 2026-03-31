import { useState } from "react";
import {
  IconButton, Badge, Popover, Box, Typography,
  Button, Tooltip, Chip, Collapse,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useEvents, type EventActionMeta, type EventSeverity } from "../hooks/useEventBus";
import {
  groupEventsByTime, formatExactTime, actionLabel, formatCategory, SEVERITY_COLOR,
  type EventCluster,
} from "./notificationBellHelpers";

function SeverityDot({ severity }: { severity: EventSeverity }) {
  return (
    <Box sx={{
      width: 8, height: 8, borderRadius: "50%",
      bgcolor: SEVERITY_COLOR[severity], flexShrink: 0, mt: "5px",
    }} />
  );
}

interface ClusterSectionProps {
  cluster: EventCluster;
  defaultExpanded: boolean;
  onAction: (meta: EventActionMeta) => void;
}

function ClusterSection({ cluster, defaultExpanded, onAction }: ClusterSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, py: 0.75, cursor: "pointer", bgcolor: "action.hover",
          "&:hover": { bgcolor: "action.selected" },
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {cluster.label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{cluster.events.length}</Typography>
          {expanded
            ? <ExpandLessIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            : <ExpandMoreIcon sx={{ fontSize: 14, color: "text.secondary" }} />
          }
        </Box>
      </Box>
      <Collapse in={expanded}>
        {cluster.events.map((event) => (
          <Box key={event.id} sx={{ display: "flex", gap: 1, px: 1.5, py: 0.75, borderTop: 1, borderColor: "divider" }}>
            <SeverityDot severity={event.severity} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontSize: 13, flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                  {event.message}
                </Typography>
                {event.actionMeta && (
                  <Button size="small" sx={{ textTransform: "none", fontSize: 11, py: 0, px: 0.5, minWidth: 0, flexShrink: 0 }}
                    onClick={() => onAction(event.actionMeta!)}>
                    {actionLabel(event.actionMeta)}
                  </Button>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
                <Chip label={formatCategory(event.category)} size="small" variant="outlined"
                  sx={{ fontSize: 10, height: 16, "& .MuiChip-label": { px: 0.75 } }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {formatExactTime(event.timestamp)}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Collapse>
    </Box>
  );
}

export interface NotificationBellProps {
  onFocusSession?: (sessionId: string, label: string) => void;
  onViewProposal?: (slug: string) => void;
}

export function NotificationBell({ onFocusSession, onViewProposal }: NotificationBellProps) {
  const { events, unreadCount, markAllRead, clearAll } = useEvents();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markAllRead();
  };

  const handleAction = (meta: EventActionMeta) => {
    if (meta.type === "focus-session") onFocusSession?.(meta.sessionId, meta.label);
    else if (meta.type === "view-proposal") onViewProposal?.(meta.slug);
    setAnchorEl(null);
  };

  const clusters = groupEventsByTime(events);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} size="small" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 500 } } }}
      >
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" fontWeight={600}>Notifications</Typography>
          {events.length > 0 && (
            <Button size="small" onClick={clearAll} sx={{ textTransform: "none", fontSize: 12, py: 0 }}>
              Clear all
            </Button>
          )}
        </Box>
        <Box sx={{ overflow: "auto", maxHeight: 440 }}>
          {clusters.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary" variant="body2">No notifications yet</Typography>
            </Box>
          ) : (
            clusters.map((cluster, idx) => (
              <ClusterSection
                key={cluster.startTimestamp}
                cluster={cluster}
                defaultExpanded={idx === 0}
                onAction={handleAction}
              />
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}
