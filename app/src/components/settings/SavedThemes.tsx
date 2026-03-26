import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  CardActionArea,
  IconButton,
  TextField,
  Button,
  Alert,
  Tooltip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { BrandingConfig } from "../../lib/branding";

interface SavedTheme {
  id: string;
  label: string;
  config: BrandingConfig;
  createdAt: string;
}

async function fetchSaved(): Promise<SavedTheme[]> {
  const res = await fetch("/api/branding/saved");
  if (!res.ok) return [];
  return res.json();
}

async function saveTheme(label: string, config: BrandingConfig): Promise<SavedTheme> {
  const res = await fetch("/api/branding/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, config }),
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}

async function deleteTheme(id: string): Promise<void> {
  await fetch(`/api/branding/saved/${id}`, { method: "DELETE" });
}

function ThemeSwatch({ theme, onLoad, onDelete }: {
  theme: SavedTheme;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const p = theme.config.dark;
  return (
    <Card variant="outlined" sx={{ transition: "all 0.25s ease" }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <CardActionArea onClick={onLoad} sx={{ p: 1, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {[p.primary, p.secondary, p.background].map((c, i) => (
                <Box
                  key={`${c}-${i}`}
                  sx={{
                    width: 20, height: 20, borderRadius: "5px",
                    bgcolor: c, border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" fontWeight={600}>{theme.label}</Typography>
          </Box>
        </CardActionArea>
        <Tooltip title="Delete saved theme">
          <IconButton size="small" onClick={onDelete} sx={{ mr: 0.5 }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
}

export function SavedThemes({ current, onLoad }: {
  current: BrandingConfig;
  onLoad: (config: BrandingConfig) => void;
}) {
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchSaved().then(setThemes).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await saveTheme(label.trim(), current);
      setLabel("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteTheme(id);
    refresh();
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Saved Themes</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name for current theme"
          size="small"
          sx={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleSave}
          disabled={!label.trim() || saving}
          startIcon={<SaveIcon />}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Save current
        </Button>
      </Box>

      {themes.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No saved themes yet. Save your current theme to reuse it later.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {themes.map((t) => (
            <ThemeSwatch
              key={t.id}
              theme={t}
              onLoad={() => onLoad(t.config)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
