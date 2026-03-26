import { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  Collapse,
  Stack,
  InputAdornment,
} from "@mui/material";
import type { BrandingConfig, PaletteConfig } from "../../lib/branding";

export interface ColorPickerProps {
  config: BrandingConfig;
  mode: "dark" | "light";
  onChange: (updated: BrandingConfig) => void;
}

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

type SlotKey = keyof Pick<PaletteConfig, "primary" | "accent" | "background" | "surface" | "text">;

const SLOTS: { key: SlotKey; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
];

function normalizeHex(raw: string): string | null {
  const match = raw.match(HEX_RE);
  if (!match) return null;
  return `#${match[1].toLowerCase()}`;
}

export function ColorPicker({ config, mode, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const palette = config[mode];

  const [drafts, setDrafts] = useState<Record<SlotKey, string>>(() => ({
    primary: palette.primary,
    accent: palette.accent,
    background: palette.background,
    surface: palette.surface,
    text: palette.text,
  }));

  const [errors, setErrors] = useState<Record<SlotKey, boolean>>(() => ({
    primary: false,
    accent: false,
    background: false,
    surface: false,
    text: false,
  }));

  function handleChange(key: SlotKey, raw: string) {
    setDrafts((prev) => ({ ...prev, [key]: raw }));

    const hex = normalizeHex(raw);
    if (!hex) {
      setErrors((prev) => ({ ...prev, [key]: true }));
      return;
    }

    setErrors((prev) => ({ ...prev, [key]: false }));
    const updatedPalette: PaletteConfig = { ...palette, [key]: hex };
    const next: BrandingConfig = { ...config, [mode]: updatedPalette };
    onChange(next);
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        size="small"
        variant="text"
        onClick={() => setOpen((prev) => !prev)}
        sx={{ textTransform: "none", mb: 1 }}
      >
        {open ? "Hide custom colors" : "Customize colors"}
      </Button>

      <Collapse in={open}>
        <Stack spacing={1.5} sx={{ pl: 1, pr: 1 }}>
          {SLOTS.map(({ key, label }) => (
            <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "4px",
                  bgcolor: normalizeHex(drafts[key]) ?? palette[key],
                  border: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ width: 90, flexShrink: 0 }}>
                {label}
              </Typography>
              <TextField
                size="small"
                value={drafts[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                error={errors[key]}
                helperText={errors[key] ? "Invalid hex" : undefined}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">#</InputAdornment>
                    ),
                  },
                }}
                sx={{ maxWidth: 160 }}
              />
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}
