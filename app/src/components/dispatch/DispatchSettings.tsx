import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { AgentType, DispatchMode } from "../../types/dispatch";

export interface DispatchSettingsState {
  mode: DispatchMode;
  agent: AgentType;
  autonomy: number; // 0 = interactive, 1 = full auto
  autoCommit: boolean;
}

interface Props {
  value: DispatchSettingsState;
  onChange: (next: DispatchSettingsState) => void;
  detectedAgent: string;
}

const autonomyMarks = [
  { value: 0, label: "Interactive" },
  { value: 1, label: "Autonomous" },
];

function autonomyDescription(level: number): string {
  if (level === 0) return "Agent pauses for approval before each action.";
  return "Agent runs without interruption. Uses --dangerously-skip-permissions.";
}

export function DispatchSettings({ value, onChange, detectedAgent }: Props) {
  const set = <K extends keyof DispatchSettingsState>(
    key: K,
    v: DispatchSettingsState[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        Execution Settings
      </Typography>

      {/* Mode: Plan vs Execute */}
      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Mode</InputLabel>
          <Select
            value={value.mode}
            label="Mode"
            onChange={(e) => set("mode", e.target.value as DispatchMode)}
          >
            <MenuItem value="dispatch">Execute</MenuItem>
            <MenuItem value="proposal">Plan</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Agent</InputLabel>
          <Select
            value={value.agent}
            label="Agent"
            onChange={(e) => set("agent", e.target.value as AgentType)}
          >
            <MenuItem value="auto">Auto ({detectedAgent})</MenuItem>
            <MenuItem value="claude">Claude Code</MenuItem>
            <MenuItem value="codex">Codex</MenuItem>
            <MenuItem value="opencode">OpenCode</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {value.mode === "dispatch"
          ? "Sends the prompt directly to the agent for immediate execution."
          : "Creates a proposal document for review before any code is written."}
      </Typography>

      {/* Autonomy slider -- only relevant in execute mode */}
      {value.mode === "dispatch" && (
        <Box sx={{ px: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Autonomy
          </Typography>
          <Slider
            value={value.autonomy}
            min={0}
            max={1}
            step={1}
            marks={autonomyMarks}
            onChange={(_, v) => set("autonomy", v as number)}
            sx={{ mt: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            {autonomyDescription(value.autonomy)}
          </Typography>
        </Box>
      )}

      {/* Auto-commit -- only for execute + autonomous */}
      {value.mode === "dispatch" && value.autonomy === 1 && (
        <FormControlLabel
          control={
            <Switch
              checked={value.autoCommit}
              onChange={(_, c) => set("autoCommit", c)}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              Auto-commit changes when done
            </Typography>
          }
        />
      )}
    </Stack>
  );
}
