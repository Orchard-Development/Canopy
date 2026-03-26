import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ProviderCard, type ProviderId } from "./ProviderCard";
import type { StepProps } from "./registry";

const PROVIDERS: Array<{ id: ProviderId; label: string; placeholder: string }> = [
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI (Codex)", placeholder: "sk-..." },
  { id: "xai", label: "xAI (Grok)", placeholder: "xai-..." },
];

interface SettingsSnapshot {
  claude_auth_mode?: string;
  codex_auth_mode?: string;
  anthropic_api_key?: string;
  openai_api_key?: string;
  xai_api_key?: string;
}

function detectConnected(s: SettingsSnapshot): Set<ProviderId> {
  const set = new Set<ProviderId>();
  if (s.anthropic_api_key) set.add("anthropic");
  if (s.openai_api_key) set.add("openai");
  if (s.xai_api_key) set.add("xai");
  return set;
}

export function AiProviderStep({ onComplete, onBack }: StepProps) {
  const [connected, setConnected] = useState<Set<ProviderId>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: SettingsSnapshot) => setConnected(detectConnected(s)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-advance when both are already configured
  useEffect(() => {
    if (loading) return;
    if (connected.size >= 2) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [connected, loading, onComplete]);

  function markConnected(id: ProviderId) {
    setConnected((prev) => new Set(prev).add(id));
  }

  const allConnected = connected.size >= 2;
  const anthropicConnected = connected.has("anthropic");

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", py: 6, px: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 3, textTransform: "none" }}>
        Back
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Add your API keys
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        An Anthropic API key is required. OpenAI and xAI are optional. Everything stays on your machine.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : allConnected ? (
        <Stack alignItems="center" spacing={2} sx={{ py: 3 }}>
          <CheckCircleIcon
            sx={{
              fontSize: 64,
              color: "success.main",
              animation: "story-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
          <Typography
            variant="h6"
            color="success.main"
            sx={{ animation: "story-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards", opacity: 0 }}
          >
            All providers connected
          </Typography>
        </Stack>
      ) : (
        <>
          <Stack spacing={2} sx={{ mb: 3 }}>
            {PROVIDERS.map((p) => (
              <ProviderCard
                key={p.id}
                id={p.id}
                label={p.label}
                placeholder={p.placeholder}
                connected={connected.has(p.id)}
                onConnected={() => markConnected(p.id)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={onComplete}
              disabled={!anthropicConnected}
              disableElevation
            >
              Continue
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
