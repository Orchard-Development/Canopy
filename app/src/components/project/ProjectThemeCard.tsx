import { useState } from "react";
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Stack,
  TextField,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import LanguageIcon from "@mui/icons-material/Language";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Divider from "@mui/material/Divider";
import { api, type ProjectRecord } from "../../lib/api";
import { useActiveProject } from "../../hooks/useActiveProject";
import { useColorMode } from "../../hooks/useColorMode";
import { MOOD_PRESETS, type MoodPreset } from "../onboarding/presets";
import { PreviewPanel } from "../onboarding/PreviewPanel";
import { type BrandingConfig } from "../../lib/branding";

interface Props {
  project: ProjectRecord;
  onUpdate: () => void;
}

function MoodSwatch({ preset, active, onSelect }: {
  preset: MoodPreset;
  active: boolean;
  onSelect: () => void;
}) {
  const p = preset.config.dark;
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: active ? p.primary : "divider",
        borderWidth: active ? 2 : 1,
        transition: "all 0.25s ease",
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[p.primary, p.secondary, p.background].map((c) => (
              <Box
                key={c}
                sx={{
                  width: 20, height: 20, borderRadius: "5px",
                  bgcolor: c, border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600}>{preset.label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {preset.description}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

function activePresetId(theme: Record<string, unknown> | undefined): string | null {
  if (!theme) return null;
  const dark = theme.dark as Record<string, string> | undefined;
  if (!dark) return null;
  const match = MOOD_PRESETS.find(
    (p) => p.config.dark.primary === dark.primary
      && p.config.dark.background === dark.background,
  );
  return match?.id ?? null;
}

export function ProjectThemeCard({ project, onUpdate }: Props) {
  const { refresh: refreshActiveProject } = useActiveProject();
  const { mode } = useColorMode();
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [error, setError] = useState("");
  const [showAllPresets, setShowAllPresets] = useState(false);

  const theme = project.config?.theme as Record<string, unknown> | undefined;
  const hasTheme = !!theme && Object.keys(theme).length > 0;
  const selected = activePresetId(theme);
  const brandName = (theme?.brandName as string) || null;

  // Build a preview BrandingConfig from the current project theme
  const previewConfig = hasTheme ? (theme as unknown as BrandingConfig) : null;

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      await api.generateProjectTheme(project.id, description || undefined);
      onUpdate();
      refreshActiveProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate theme");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUrlTheme() {
    if (!brandUrl.trim()) return;
    setFetchingUrl(true);
    setError("");
    try {
      await api.themeFromUrl(project.id, brandUrl.trim());
      onUpdate();
      refreshActiveProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract theme from URL");
    } finally {
      setFetchingUrl(false);
    }
  }

  async function handlePreset(preset: MoodPreset) {
    setError("");
    try {
      const { name: _n, subtitle: _s, ...themeFields } = preset.config;
      const config = { ...(project.config ?? {}), theme: themeFields };
      await api.updateProject(project.id, { config });
      onUpdate();
      refreshActiveProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply preset");
    }
  }

  async function handleClear() {
    setError("");
    try {
      const config = { ...(project.config ?? {}) };
      delete config.theme;
      await api.updateProject(project.id, { config });
      onUpdate();
      refreshActiveProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear theme");
    }
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Project Theme</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Give this project its own look. The theme applies automatically when this project is active.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
            {brandName && previewConfig && (
              <Card
                variant="outlined"
                sx={{
                  borderColor: (previewConfig as BrandingConfig).dark?.primary ?? "primary.main",
                  borderWidth: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ p: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {[
                      (previewConfig as BrandingConfig).dark?.primary,
                      (previewConfig as BrandingConfig).dark?.secondary,
                      (previewConfig as BrandingConfig).dark?.background,
                    ].filter(Boolean).map((c) => (
                      <Box
                        key={c}
                        sx={{
                          width: 20, height: 20, borderRadius: "5px",
                          bgcolor: c, border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                    ))}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{brandName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Brand colors (active)
                    </Typography>
                  </Box>
                </Box>
              </Card>
            )}

            <Stack spacing={1} sx={{ mb: 2 }}>
              {(showAllPresets ? MOOD_PRESETS : MOOD_PRESETS.slice(0, 5)).map((p) => (
                <MoodSwatch
                  key={p.id}
                  preset={p}
                  active={selected === p.id}
                  onSelect={() => handlePreset(p)}
                />
              ))}
              {MOOD_PRESETS.length > 5 && (
                <Button
                  size="small"
                  onClick={() => setShowAllPresets((v) => !v)}
                  endIcon={showAllPresets ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ textTransform: "none", alignSelf: "flex-start" }}
                >
                  {showAllPresets ? "Show less" : `View all ${MOOD_PRESETS.length} presets`}
                </Button>
              )}
            </Stack>

            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "Warm orange with sharp corners"'
              multiline
              rows={2}
              fullWidth
              size="small"
              disabled={generating || fetchingUrl}
              sx={{ mb: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleGenerate}
              disabled={generating || fetchingUrl}
              startIcon={generating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
              sx={{ textTransform: "none", mb: 2 }}
            >
              {generating ? "Generating..." : "Generate from description"}
            </Button>

            <Divider sx={{ my: 1 }} />

            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              From website
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Paste a URL and AI will research the brand's official colors to build a theme.
            </Typography>
            <TextField
              value={brandUrl}
              onChange={(e) => setBrandUrl(e.target.value)}
              placeholder="https://example.com"
              fullWidth
              size="small"
              disabled={generating || fetchingUrl}
              sx={{ mb: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUrlTheme();
                }
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={handleUrlTheme}
                disabled={!brandUrl.trim() || generating || fetchingUrl}
                startIcon={fetchingUrl ? <CircularProgress size={16} /> : <LanguageIcon />}
                sx={{ textTransform: "none" }}
              >
                {fetchingUrl ? "Researching brand..." : "Research brand colors"}
              </Button>
              {hasTheme && (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<RestartAltIcon />}
                  onClick={handleClear}
                  sx={{ textTransform: "none" }}
                >
                  Clear theme
                </Button>
              )}
            </Stack>
          </Box>

          {previewConfig && (
            <Box sx={{ flex: "0 0 200px" }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Preview
              </Typography>
              <PreviewPanel config={previewConfig} mode="dark" />
              <Box sx={{ mt: 1 }}>
                <PreviewPanel config={previewConfig} mode="light" />
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
