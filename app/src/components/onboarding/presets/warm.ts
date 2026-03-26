import type { MoodPreset } from "./index";
import { BASE } from "./base";

export const rose: MoodPreset = {
  id: "rose",
  label: "Rose",
  description: "Soft rose and blush, warm and refined",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #e11d48, #f472b6)",
    surfaceGradient: "linear-gradient(180deg, #18080e 0%, #1e1018 100%)",
    useGradient: true,
    borderRadius: 12,
    elevation: "subtle",
    dark: {
      primary: "#fb7185", secondary: "#f472b6", tertiary: "#e879a8",
      success: "#4ade80", warning: "#fbbf24", error: "#ef4444",
      background: "#18080e", surface: "#1e1018", surfaceAlt: "#2a1622",
      border: "#4a2038", highlight: "#3a1828", accent: "#e11d48",
      text: "#fff1f2", textSecondary: "#fda4af", textMuted: "#8a4a5a",
    },
    light: {
      primary: "#e11d48", secondary: "#db2777", tertiary: "#be185d",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#fff1f2", surface: "#ffffff", surfaceAlt: "#ffe4e6",
      border: "#fecdd3", highlight: "#fff5f6", accent: "#e11d48",
      text: "#4c0519", textSecondary: "#9f1239", textMuted: "#c0707e",
    },
  },
};

export const copper: MoodPreset = {
  id: "copper",
  label: "Copper",
  description: "Warm metallic copper and bronze",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #b45309, #a16207)",
    surfaceGradient: "linear-gradient(180deg, #12100a 0%, #1c1810 100%)",
    useGradient: true,
    borderRadius: 8,
    elevation: "raised",
    dark: {
      primary: "#d4944a", secondary: "#c4843a", tertiary: "#e8a85a",
      success: "#4ade80", warning: "#f59e0b", error: "#ef4444",
      background: "#12100a", surface: "#1c1810", surfaceAlt: "#262016",
      border: "#3e3424", highlight: "#302818", accent: "#b45309",
      text: "#f5edd8", textSecondary: "#b4a484", textMuted: "#6e6044",
    },
    light: {
      primary: "#92400e", secondary: "#854d0e", tertiary: "#78350f",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#fdf8f0", surface: "#ffffff", surfaceAlt: "#f5ead8",
      border: "#e0ccaa", highlight: "#faf4ea", accent: "#b45309",
      text: "#3a2a10", textSecondary: "#6e5428", textMuted: "#a0885e",
    },
  },
};

export const ember: MoodPreset = {
  id: "ember",
  label: "Ember",
  description: "Warm amber and flame, energizing",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    surfaceGradient: "linear-gradient(180deg, #1a0e08 0%, #241408 100%)",
    useGradient: true,
    borderRadius: 8,
    elevation: "raised",
    dark: {
      primary: "#f59e0b", secondary: "#fb923c", tertiary: "#fbbf24",
      success: "#4ade80", warning: "#fcd34d", error: "#ef4444",
      background: "#1a0e08", surface: "#241408", surfaceAlt: "#2e1c0e",
      border: "#4a3018", highlight: "#3a2410", accent: "#d97706",
      text: "#fef3c7", textSecondary: "#d4a060", textMuted: "#7a5a30",
    },
    light: {
      primary: "#b45309", secondary: "#d97706", tertiary: "#92400e",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#fffbf0", surface: "#ffffff", surfaceAlt: "#fef3c7",
      border: "#e8d4a0", highlight: "#fff8e8", accent: "#d97706",
      text: "#3a2008", textSecondary: "#78500e", textMuted: "#a08050",
    },
  },
};

export const terra: MoodPreset = {
  id: "terra",
  label: "Terra",
  description: "Earthy terracotta and olive, grounded",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #d4956a, #a0522d)",
    surfaceGradient: "linear-gradient(180deg, #141008 0%, #1e1a10 100%)",
    useGradient: true,
    borderRadius: 8,
    elevation: "subtle",
    dark: {
      primary: "#d4956a", secondary: "#8b9a6e", tertiary: "#c4804a",
      success: "#6ee7b7", warning: "#fbbf24", error: "#ef4444",
      background: "#141008", surface: "#1e1a10", surfaceAlt: "#282218",
      border: "#3e3420", highlight: "#302a18", accent: "#a0522d",
      text: "#f0e8d8", textSecondary: "#b0a080", textMuted: "#6e6040",
    },
    light: {
      primary: "#8b4513", secondary: "#6b7a4e", tertiary: "#704010",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#faf6f0", surface: "#ffffff", surfaceAlt: "#f0e8d8",
      border: "#d8c8a8", highlight: "#f8f2e8", accent: "#a0522d",
      text: "#2a1e0a", textSecondary: "#5a4a28", textMuted: "#988868",
    },
  },
};
