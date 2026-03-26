import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  MenuItem,
  TextField,
  Slider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { api } from "../../lib/api";

interface LocalAiStatus {
  status: string;
  model: string | null;
  ollama: boolean;
  routingMode: string;
  hasCloudKey: boolean;
  tier: string | null;
  supportsTools: boolean;
}

const TIER_COLORS: Record<string, "default" | "warning" | "success"> = {
  small: "default",
  medium: "warning",
  large: "success",
};

export function LocalAiCard() {
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState({ mode: "local-only", threshold: 1000 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([api.localAiStatus(), api.localAiRouting()]);
      setStatus(s);
      setRouting({ mode: r.mode, threshold: r.threshold });
    } catch {
      setMessage({ text: "Could not reach local AI service", severity: "error" });
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleRoutingChange(mode: string) {
    setSaving(true);
    try {
      await api.localAiSetRouting({ mode });
      setRouting((prev) => ({ ...prev, mode }));
    } catch {
      setMessage({ text: "Failed to update routing", severity: "error" });
    }
    setSaving(false);
  }

  async function handleThresholdChange(threshold: number) {
    setRouting((prev) => ({ ...prev, threshold }));
    try {
      await api.localAiSetRouting({ threshold });
    } catch { /* best effort */ }
  }

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack alignItems="center" py={2}><CircularProgress size={24} /></Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Local AI Routing</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Control how prompts are routed between the local Ollama model and cloud APIs.
        </Typography>

        <Stack spacing={2}>
          {message && (
            <Alert severity={message.severity} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2">Status:</Typography>
            <Chip
              label={status?.ollama ? "Ollama running" : "Ollama offline"}
              color={status?.ollama ? "success" : "default"}
              size="small"
            />
            {status?.tier && (
              <Chip
                label={`${status.tier} model`}
                color={TIER_COLORS[status.tier] ?? "default"}
                size="small"
              />
            )}
            {status?.supportsTools && (
              <Chip label="Tools supported" color="info" size="small" />
            )}
            {status?.hasCloudKey && (
              <Chip label="Cloud API configured" color="success" size="small" variant="outlined" />
            )}
          </Stack>

          {status?.model && (
            <Typography variant="body2" color="text.secondary">
              Active model: {status.model}
            </Typography>
          )}

          <TextField
            select
            label="Routing Mode"
            value={routing.mode}
            onChange={(e) => handleRoutingChange(e.target.value)}
            size="small"
            disabled={saving}
            helperText={
              routing.mode === "local-only"
                ? "All prompts handled by the local model"
                : routing.mode === "hybrid"
                  ? "Simple tasks local (free), complex tasks routed to cloud"
                  : "All prompts sent to cloud API"
            }
          >
            <MenuItem value="local-only">Local only</MenuItem>
            <MenuItem value="hybrid">Hybrid (local + cloud)</MenuItem>
            <MenuItem value="cloud-only">Cloud only</MenuItem>
          </TextField>

          {routing.mode === "hybrid" && (
            <>
              <Typography variant="body2" color="text.secondary">
                Cloud fallback threshold: {routing.threshold} tokens
              </Typography>
              <Slider
                value={routing.threshold}
                onChange={(_, v) => setRouting((prev) => ({ ...prev, threshold: v as number }))}
                onChangeCommitted={(_, v) => handleThresholdChange(v as number)}
                min={100}
                max={4000}
                step={100}
                valueLabelDisplay="auto"
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                Prompts requesting more than {routing.threshold} tokens will route to the cloud API.
              </Typography>
              {!status?.hasCloudKey && (
                <Alert severity="warning">
                  Hybrid mode requires a cloud API key. Configure one in the AI Providers section above.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
