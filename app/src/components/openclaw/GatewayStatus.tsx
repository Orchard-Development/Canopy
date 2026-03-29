import { Stack, Chip, Button, Typography, Switch, FormControlLabel } from "@mui/material";
import type { OpenClawStatus } from "../../lib/api";

interface Props {
  status: OpenClawStatus | null;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSetEnabled: (enabled: boolean) => void;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  running: "success",
  stopped: "default",
  restarting: "warning",
  error: "error",
};

export function GatewayStatus({ status, onStart, onStop, onRestart, onSetEnabled }: Props) {
  const s = status?.status ?? "unknown";
  const enabled = status?.enabled ?? false;
  const isRunning = s === "running";

  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(_, checked) => onSetEnabled(checked)}
            size="small"
          />
        }
        label={enabled ? "Enabled" : "Disabled"}
        labelPlacement="end"
      />
      {enabled && (
        <Chip
          label={s}
          size="small"
          color={STATUS_COLOR[s] ?? "default"}
          variant={isRunning ? "filled" : "outlined"}
        />
      )}
      {status?.version && (
        <Typography variant="caption" color="text.secondary">
          v{status.version}
        </Typography>
      )}
      {status?.started_at && isRunning && (
        <Typography variant="caption" color="text.secondary">
          up since {new Date(status.started_at).toLocaleTimeString()}
        </Typography>
      )}
      {enabled && (
        <Stack direction="row" spacing={1} sx={{ ml: "auto !important" }}>
          {!isRunning && (
            <Button size="small" variant="contained" onClick={onStart}>Start</Button>
          )}
          {isRunning && (
            <Button size="small" variant="outlined" onClick={onRestart}>Restart</Button>
          )}
          {isRunning && (
            <Button size="small" variant="outlined" color="error" onClick={onStop}>Stop</Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
