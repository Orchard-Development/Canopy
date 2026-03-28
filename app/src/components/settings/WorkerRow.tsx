import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  formatCadence,
  FRIENDLY_NAMES,
  getDetailFields,
  getPrimaryMetric,
  getWorkerState,
  STATE_COLORS,
  timeAgo,
} from "./worker-metrics";
import type { WorkerStatus } from "./worker-metrics";

interface WorkerRowProps {
  worker: WorkerStatus;
  toggling: boolean;
  onToggle: (name: string, enabled: boolean) => void;
  onTrigger: (name: string) => void;
}

export function WorkerRow({ worker, toggling, onToggle, onTrigger }: WorkerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const state = getWorkerState(worker);
  const metric = getPrimaryMetric(worker);

  return (
    <Box sx={{ borderRadius: 1, bgcolor: "action.hover" }}>
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 1,
          px: 1.5,
          cursor: "pointer",
          opacity: state === "disabled" ? 0.6 : 1,
        }}
      >
        <Tooltip title={state} placement="left">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: STATE_COLORS[state],
              flexShrink: 0,
            }}
          />
        </Tooltip>

        <Box sx={{ minWidth: 130 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {FRIENDLY_NAMES[worker.name] ?? worker.name}
          </Typography>
        </Box>

        <Chip
          label={formatCadence(worker.cadence)}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.65rem", height: 20 }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
          {metric.value} {metric.label}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 55 }}>
          {timeAgo(worker.last_run)}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {worker.enabled && (
          <Tooltip title="Trigger now">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onTrigger(worker.name); }}
              sx={{ p: 0.25 }}
            >
              <PlayArrowIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        <Switch
          size="small"
          checked={worker.enabled}
          disabled={toggling}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggle(worker.name, worker.enabled)}
          sx={{ flexShrink: 0 }}
        />
      </Box>

      <Collapse in={expanded}>
        <DetailPanel worker={worker} />
      </Collapse>
    </Box>
  );
}

function DetailPanel({ worker }: { worker: WorkerStatus }) {
  const fields = getDetailFields(worker);
  if (fields.length === 0) {
    return (
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          No additional details available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0.5,
        px: 2,
        pb: 1.5,
        pt: 0.5,
      }}
    >
      {fields.map((f) => (
        <Stack key={f.label} direction="row" spacing={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
            {f.label}:
          </Typography>
          <Typography variant="caption" fontWeight={500}>
            {f.value}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}
