import type { MoodPreset } from "./index";
import { BASE } from "./base";

export const crimson: MoodPreset = {
  id: "crimson",
  label: "Crimson",
  description: "Deep red and charcoal, bold and intense",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #dc2626, #991b1b)",
    surfaceGradient: "linear-gradient(180deg, #140a0a 0%, #1c0e0e 100%)",
    useGradient: true,
    borderRadius: 8,
    elevation: "raised",
    dark: {
      primary: "#ef4444", secondary: "#f87171", tertiary: "#dc2626",
      success: "#4ade80", warning: "#fbbf24", error: "#fca5a5",
      background: "#140a0a", surface: "#1c0e0e", surfaceAlt: "#261414",
      border: "#4a2020", highlight: "#3a1818", accent: "#dc2626",
      text: "#fee2e2", textSecondary: "#f87171", textMuted: "#7a3a3a",
    },
    light: {
      primary: "#dc2626", secondary: "#b91c1c", tertiary: "#991b1b",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#fef2f2", surface: "#ffffff", surfaceAlt: "#fee2e2",
      border: "#fecaca", highlight: "#fff5f5", accent: "#dc2626",
      text: "#450a0a", textSecondary: "#991b1b", textMuted: "#b86060",
    },
  },
};

export const scarlet: MoodPreset = {
  id: "scarlet",
  label: "Scarlet",
  description: "Fiery red-orange, warm and commanding",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #ef4444, #ea580c)",
    surfaceGradient: "linear-gradient(180deg, #160a06 0%, #1e100a 100%)",
    useGradient: true,
    borderRadius: 10,
    elevation: "subtle",
    dark: {
      primary: "#f87171", secondary: "#fb923c", tertiary: "#ef4444",
      success: "#4ade80", warning: "#fbbf24", error: "#fca5a5",
      background: "#160a06", surface: "#1e100a", surfaceAlt: "#281810",
      border: "#4a2818", highlight: "#3a1e10", accent: "#ea580c",
      text: "#fff1e6", textSecondary: "#fb923c", textMuted: "#7a5040",
    },
    light: {
      primary: "#dc2626", secondary: "#ea580c", tertiary: "#c2410c",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#fff7ed", surface: "#ffffff", surfaceAlt: "#ffedd5",
      border: "#fed7aa", highlight: "#fffaf5", accent: "#ea580c",
      text: "#431407", textSecondary: "#9a3412", textMuted: "#c07050",
    },
  },
};
