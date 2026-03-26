import { Box, IconButton, Tooltip, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { ResizableDrawer } from "../ResizableDrawer";
import { ActivityFeed } from "./ActivityFeed";
import { WorkspacePulse } from "./WorkspacePulse";
import { useActivityFeed } from "../../hooks/useActivityFeed";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ActivityDrawer({ open, onClose }: Props) {
  const { entries, pulse, lastSync, clear, connected } = useActivityFeed();

  return (
    <ResizableDrawer
      open={open}
      side="left"
      settingsPrefix="activity"
      defaultWidth={420}
      minWidth={300}
      maxWidthRatio={0.5}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FiberManualRecordIcon
            sx={{ fontSize: 8, color: connected ? "success.main" : "text.disabled" }}
          />
          <Box sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}>Activity</Box>
          {entries.length > 0 && (
            <Chip label={entries.length} size="small" variant="outlined" />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={clear}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {pulse && <WorkspacePulse pulse={pulse} />}
      <ActivityFeed entries={entries} lastSync={lastSync} />
    </ResizableDrawer>
  );
}
