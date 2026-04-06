import { Paper, Typography, Stack, Chip } from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import type { RemoteTaskEventData } from "../../../types/timeline";

const stateConfig: Record<string, { color: string; icon: typeof TaskAltIcon; label: string }> = {
  created: { color: "text.secondary", icon: HourglassEmptyIcon, label: "requested" },
  pending: { color: "warning.main", icon: HourglassEmptyIcon, label: "pending approval" },
  approved: { color: "info.main", icon: HourglassEmptyIcon, label: "approved" },
  executing: { color: "info.main", icon: HourglassEmptyIcon, label: "executing" },
  completed: { color: "success.main", icon: TaskAltIcon, label: "completed" },
  failed: { color: "error.main", icon: ErrorOutlineIcon, label: "failed" },
  rejected: { color: "error.main", icon: ErrorOutlineIcon, label: "rejected" },
};

interface Props {
  data: RemoteTaskEventData;
  timestamp: string;
}

export function RemoteTaskEvent({ data, timestamp }: Props) {
  const config = stateConfig[data.state] || stateConfig.created;
  const Icon = config.icon;
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1, borderLeft: 3, borderColor: config.color }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon sx={{ fontSize: 16, color: config.color }} />
        <Typography variant="body2" fontWeight={600}>
          Task: {data.intent}
        </Typography>
        <Chip label={config.label} size="small" sx={{ height: 20, fontSize: 11 }} />
        <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
          {data.from} → {data.to} at {time}
        </Typography>
      </Stack>
      {data.digest && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 12 }}>
          {data.digest}
        </Typography>
      )}
    </Paper>
  );
}
