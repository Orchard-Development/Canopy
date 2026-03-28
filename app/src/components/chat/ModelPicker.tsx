import { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { api, type AiModelOption } from "../../lib/api";

const PROVIDER_BADGE: Record<string, { color: string; label: string }> = {
  anthropic: { color: "warning.main", label: "Claude" },
  xai: { color: "info.main", label: "Grok" },
  gemini: { color: "secondary.main", label: "Gemini" },
  openai: { color: "success.main", label: "OpenAI" },
  groq: { color: "error.main", label: "Groq" },
  openrouter: { color: "#7c3aed", label: "OpenRouter" },
};

interface Props {
  value: string;
  onChange: (modelId: string) => void;
  onModelsLoaded?: (models: AiModelOption[]) => void;
}

export function ModelPicker({ value, onChange, onModelsLoaded }: Props) {
  const [models, setModels] = useState<AiModelOption[]>([]);

  useEffect(() => {
    api.aiModels().then((res) => {
      const list = res.models ?? [];
      setModels(list);
      onModelsLoaded?.(list);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: SelectChangeEvent) => onChange(e.target.value);

  // Auto-select first model if none selected
  useEffect(() => {
    if (!value && models.length > 0) {
      onChange(models[0].id);
    }
  }, [value, models, onChange]);

  if (models.length === 0) return null;

  return (
    <Box sx={{ minWidth: 180 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>Model</InputLabel>
        <Select value={value} onChange={handleChange} label="Model">
          {models.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    fontSize: 10,
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: PROVIDER_BADGE[m.provider]?.color ?? "grey.600",
                    color: "common.white",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  {PROVIDER_BADGE[m.provider]?.label ?? m.provider}
                </Box>
                {m.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
