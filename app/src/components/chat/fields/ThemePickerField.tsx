import { useState, useMemo, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import LanguageIcon from "@mui/icons-material/Language";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { MOOD_PRESETS, type MoodPreset } from "../../onboarding/presets";
import { api } from "../../../lib/api";
import type { FieldRendererProps } from "../../../types/forms";

type ThemeSource = "none" | "preset" | "ai" | "url";

interface ThemeValue {
  source: ThemeSource;
  preset?: string;
  description?: string;
  brandUrl?: string;
}

function parseValue(raw: string): ThemeValue {
  try { return JSON.parse(raw); }
  catch { return { source: "none" }; }
}

function Swatch({ preset, active, onSelect }: {
  preset: MoodPreset; active: boolean; onSelect: () => void;
}) {
  const p = preset.config.dark;
  return (
    <Card variant="outlined" sx={{
      borderColor: active ? p.primary : "divider",
      borderWidth: active ? 2 : 1,
      transition: "all 0.2s",
    }}>
      <CardActionArea onClick={onSelect} sx={{ p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[p.primary, p.secondary, p.background].map((c) => (
              <Box key={c} sx={{
                width: 18, height: 18, borderRadius: "4px",
                bgcolor: c, border: "1px solid rgba(255,255,255,0.1)",
              }} />
            ))}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600}>{preset.label}</Typography>
            <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

/**
 * Theme selection with 4 modes: none, preset, AI, URL.
 * Value is a JSON object: { source, preset?, description?, brandUrl? }
 */
export function ThemePickerField({ value, onChange, disabled }: FieldRendererProps) {
  const tv = useMemo(() => parseValue(value), [value]);
  const [showAll, setShowAll] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  const update = useCallback(
    (patch: Partial<ThemeValue>) => onChange(JSON.stringify({ ...tv, ...patch })),
    [tv, onChange],
  );

  const handleUrlGenerate = useCallback(async () => {
    if (!tv.brandUrl?.trim()) return;
    setUrlLoading(true);
    setUrlError("");
    try {
      await api.previewThemeFromUrl(tv.brandUrl);
      // Theme will be applied on submit; just mark it as ready
      update({ brandUrl: tv.brandUrl });
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to generate theme");
    } finally {
      setUrlLoading(false);
    }
  }, [tv.brandUrl, update]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Theme</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
        Choose how to theme this project. You can always change it later.
      </Typography>
      <ToggleButtonGroup
        value={tv.source}
        exclusive
        onChange={(_e, val) => { if (val) update({ source: val }); }}
        size="small"
        sx={{ mb: 2 }}
        disabled={disabled}
      >
        <ToggleButton value="none" sx={{ textTransform: "none" }}>None</ToggleButton>
        <ToggleButton value="preset" sx={{ textTransform: "none" }}>Preset</ToggleButton>
        <ToggleButton value="ai" sx={{ textTransform: "none", gap: 0.5 }}>
          <AutoFixHighIcon sx={{ fontSize: 16 }} /> AI
        </ToggleButton>
        <ToggleButton value="url" sx={{ textTransform: "none", gap: 0.5 }}>
          <LanguageIcon sx={{ fontSize: 16 }} /> URL
        </ToggleButton>
      </ToggleButtonGroup>

      {tv.source === "preset" && (
        <Stack spacing={1}>
          {(showAll ? MOOD_PRESETS : MOOD_PRESETS.slice(0, 5)).map((p) => (
            <Swatch
              key={p.id}
              preset={p}
              active={tv.preset === p.id}
              onSelect={() => update({ preset: p.id })}
            />
          ))}
          {MOOD_PRESETS.length > 5 && (
            <Button
              size="small"
              onClick={() => setShowAll((v) => !v)}
              endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: "none", alignSelf: "flex-start" }}
            >
              {showAll ? "Show less" : `All ${MOOD_PRESETS.length} presets`}
            </Button>
          )}
        </Stack>
      )}

      {tv.source === "ai" && (
        <TextField
          size="small"
          value={tv.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder='e.g. "Warm orange with sharp corners"'
          multiline
          rows={2}
          fullWidth
          disabled={disabled}
          helperText="Leave blank to auto-generate from the project name"
        />
      )}

      {tv.source === "url" && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small"
              value={tv.brandUrl || ""}
              onChange={(e) => { update({ brandUrl: e.target.value }); setUrlError(""); }}
              placeholder="https://example.com"
              fullWidth
              disabled={disabled || urlLoading}
              helperText="AI will research the brand's colors"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlGenerate(); } }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleUrlGenerate}
              disabled={disabled || urlLoading || !tv.brandUrl?.trim()}
              startIcon={urlLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              sx={{ textTransform: "none", whiteSpace: "nowrap", mt: "1px", minWidth: 120 }}
            >
              {urlLoading ? "Researching..." : "Generate"}
            </Button>
          </Stack>
          {urlError && <Alert severity="error" onClose={() => setUrlError("")}>{urlError}</Alert>}
        </Stack>
      )}
    </Box>
  );
}
