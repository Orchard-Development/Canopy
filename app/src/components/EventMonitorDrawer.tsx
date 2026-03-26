import { Box, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EventMonitor from "../views/EventMonitor";
import { ResizableDrawer } from "./ResizableDrawer";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function EventMonitorDrawer({ open, onClose }: Props) {
  return (
    <ResizableDrawer
      open={open}
      side="left"
      settingsPrefix="events"
      defaultWidth={480}
      minWidth={320}
      maxWidthRatio={0.65}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}>Event Monitor</Box>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <EventMonitor />
      </Box>
    </ResizableDrawer>
  );
}
