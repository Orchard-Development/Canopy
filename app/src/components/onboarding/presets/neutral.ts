import type { MoodPreset } from "./index";
import { BASE } from "./base";

export const mono: MoodPreset = {
  id: "mono",
  label: "Mono",
  description: "Clean grayscale, no distraction",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #6b7280, #374151)",
    useGradient: false,
    borderRadius: 6,
    elevation: "flat",
    dark: {
      primary: "#d1d5db", secondary: "#9ca3af", tertiary: "#6b7280",
      success: "#6ee7b7", warning: "#fcd34d", error: "#fca5a5",
      background: "#0e0e0e", surface: "#181818", surfaceAlt: "#222222",
      border: "#333333", highlight: "#1e1e1e", accent: "#9ca3af",
      text: "#f3f4f6", textSecondary: "#9ca3af", textMuted: "#5a5a5a",
    },
    light: {
      primary: "#374151", secondary: "#6b7280", tertiary: "#9ca3af",
      success: "#059669", warning: "#d97706", error: "#dc2626",
      background: "#f8f8f8", surface: "#ffffff", surfaceAlt: "#f0f0f0",
      border: "#e0e0e0", highlight: "#f4f4f4", accent: "#6b7280",
      text: "#111827", textSecondary: "#6b7280", textMuted: "#aaaaaa",
    },
  },
};

export const sage: MoodPreset = {
  id: "sage",
  label: "Sage",
  description: "Muted sage green, gentle and restful",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #6b8a6e, #8faa8e)",
    surfaceGradient: "linear-gradient(180deg, #0e120e 0%, #161c16 100%)",
    useGradient: true,
    borderRadius: 10,
    elevation: "subtle",
    dark: {
      primary: "#8aaa8c", secondary: "#a0bca0", tertiary: "#7a9a7c",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#0e120e", surface: "#161c16", surfaceAlt: "#1e261e",
      border: "#304030", highlight: "#243024", accent: "#6b8a6e",
      text: "#e8f0e8", textSecondary: "#98b098", textMuted: "#5a7a5e",
    },
    light: {
      primary: "#4a6e4c", secondary: "#5a805c", tertiary: "#3a5e3c",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#f2f5f2", surface: "#ffffff", surfaceAlt: "#e5ebe5",
      border: "#c8d8c8", highlight: "#eaf2ea", accent: "#4a6e4c",
      text: "#1a2e1c", textSecondary: "#3a5e3c", textMuted: "#7a9a7c",
    },
  },
};

export const obsidian: MoodPreset = {
  id: "obsidian",
  label: "Obsidian",
  description: "Near-black with violet accents, stealth",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    surfaceGradient: "linear-gradient(180deg, #08080c 0%, #0e0e14 100%)",
    useGradient: true,
    borderRadius: 8,
    elevation: "subtle",
    dark: {
      primary: "#818cf8", secondary: "#a78bfa", tertiary: "#6366f1",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#08080c", surface: "#0e0e14", surfaceAlt: "#16161e",
      border: "#24243a", highlight: "#1a1a2e", accent: "#6366f1",
      text: "#e8e8f0", textSecondary: "#8888aa", textMuted: "#4a4a6a",
    },
    light: {
      primary: "#4f46e5", secondary: "#6366f1", tertiary: "#7c3aed",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#f5f5fa", surface: "#ffffff", surfaceAlt: "#eeeef6",
      border: "#d8d8e8", highlight: "#f0f0f8", accent: "#4f46e5",
      text: "#1a1a2e", textSecondary: "#4a4a6a", textMuted: "#8888aa",
    },
  },
};

export const ivory: MoodPreset = {
  id: "ivory",
  label: "Ivory",
  description: "Warm cream and ink, light and classic",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #c4a97a, #a08050)",
    useGradient: false,
    borderRadius: 6,
    elevation: "flat",
    dark: {
      primary: "#c4a97a", secondary: "#b0a080", tertiary: "#a09070",
      success: "#6ee7b7", warning: "#fcd34d", error: "#fca5a5",
      background: "#141210", surface: "#1c1a16", surfaceAlt: "#24221c",
      border: "#3a3628", highlight: "#2a2820", accent: "#a08050",
      text: "#f0ece4", textSecondary: "#b0a890", textMuted: "#706850",
    },
    light: {
      primary: "#5c4a2e", secondary: "#7a6040", tertiary: "#4a3a20",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#faf8f4", surface: "#fefdfb", surfaceAlt: "#f0ece4",
      border: "#e0d8c8", highlight: "#f8f6f0", accent: "#7a6040",
      text: "#2a2010", textSecondary: "#5c4a2e", textMuted: "#988868",
    },
  },
};
