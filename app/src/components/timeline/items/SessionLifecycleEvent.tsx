import { Typography, Stack, Divider } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import PauseIcon from "@mui/icons-material/Pause";
import type { SessionLifecycleData } from "../../../types/timeline";

const config = {
  started: { icon: PlayArrowIcon, label: "Session started" },
  idle: { icon: PauseIcon, label: "Session idle" },
  ended: { icon: StopIcon, label: "Session ended" },
};

interface Props {
  data: SessionLifecycleData;
  timestamp: string;
}

export function SessionLifecycleEvent({ data, timestamp }: Props) {
  const { icon: Icon, label } = config[data.event] || config.started;
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const exitLabel = data.exitCode !== undefined ? ` (exit ${data.exitCode})` : "";

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5, px: 2 }}>
      <Divider sx={{ flex: 1 }} />
      <Icon sx={{ fontSize: 14, color: "text.disabled" }} />
      <Typography variant="caption" color="text.disabled">
        {label}{exitLabel} at {time}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Stack>
  );
}
