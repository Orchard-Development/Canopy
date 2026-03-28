import {
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { SettingsData } from "./AiProviderCard";

interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

interface Props {
  settings: SettingsData;
  models: ModelOption[];
  onUpdate: (key: string, value: string) => void;
}

const MODEL_FIELDS = [
  { key: "model_classify", label: "Classification", description: "Model used for dispatch routing and intent classification" },
  { key: "model_internal", label: "Internal AI", description: "Labeling, summarization, poker decisions, profiling, auto-commit, session close reports" },
  { key: "model_dispatch_agent", label: "Dispatched Agents", description: "Model passed to spawned Claude Code sessions" },
  { key: "model_opencode_primary", label: "OpenCode Primary", description: "OpenCode build agent model" },
  { key: "model_opencode_subagent", label: "OpenCode Subagents", description: "OpenCode fix, review, and propose agent models" },
] as const;

export function ModelDefaultsCard({ settings, models, onUpdate }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Model Defaults</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose which model each automation layer uses. Unset fields fall back to built-in defaults.
        </Typography>
        <Stack spacing={2}>
          {MODEL_FIELDS.map(({ key, label, description }) => (
            <FormControl key={key} fullWidth size="small">
              <InputLabel>{label}</InputLabel>
              <Select
                value={settings[key as keyof SettingsData] ?? ""}
                label={label}
                onChange={(e) => onUpdate(key, e.target.value as string)}
              >
                <MenuItem value="">
                  <em>(not set -- uses default)</em>
                </MenuItem>
                {models.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.label} ({m.provider})
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 0.5 }}>
                {description}
              </Typography>
            </FormControl>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
