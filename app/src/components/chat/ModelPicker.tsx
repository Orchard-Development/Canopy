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
                    bgcolor: m.provider === "anthropic"
                      ? "warning.main"
                      : m.provider === "xai"
                        ? "info.main"
                        : "success.main",
                    color: "common.white",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  {m.provider === "anthropic" ? "Claude" : m.provider === "xai" ? "Grok" : "OpenAI"}
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
