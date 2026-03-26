import { useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Alert,
  Button,
  Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useEvents, type EventActionMeta } from "../hooks/useEventBus";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function actionLabel(meta: EventActionMeta): string {
  switch (meta.type) {
    case "focus-session": return "Focus";
    case "view-proposal": return "View";
  }
}

export interface NotificationBellProps {
  onFocusSession?: (sessionId: string, label: string) => void;
  onViewProposal?: (slug: string) => void;
}

export function NotificationBell({ onFocusSession, onViewProposal }: NotificationBellProps) {
  const { events, unreadCount, markAllRead } = useEvents();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markAllRead();
  };

  const handleAction = (meta: EventActionMeta) => {
    switch (meta.type) {
      case "focus-session":
        onFocusSession?.(meta.sessionId, meta.label);
        break;
      case "view-proposal":
        onViewProposal?.(meta.slug);
        break;
    }
    setAnchorEl(null);
  };

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
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480 } } }}
      >
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Notifications
          </Typography>
        </Box>
        <Box sx={{ overflow: "auto", maxHeight: 420 }}>
          {events.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary" variant="body2">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            [...events].reverse().map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <Alert
                  severity={entry.severity}
                  variant="standard"
                  action={
                    entry.actionMeta ? (
                      <Button
                        size="small"
                        sx={{ color: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}
                        onClick={() => handleAction(entry.actionMeta!)}
                      >
                        {actionLabel(entry.actionMeta)}
                      </Button>
                    ) : undefined
                  }
                  sx={{
                    py: 0,
                    px: 1,
                    "& .MuiAlert-message": { py: 0.5, flex: 1 },
                    "& .MuiAlert-icon": { py: 0.5 },
                    "& .MuiAlert-action": { py: 0, pl: 0.5, mr: 0 },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      {entry.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, flexShrink: 0 }}>
                      {formatTime(entry.timestamp)}
                    </Typography>
                  </Box>
                </Alert>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}
