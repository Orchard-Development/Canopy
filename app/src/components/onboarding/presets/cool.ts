import type { MoodPreset } from "./index";
import { BASE } from "./base";

export const midnight: MoodPreset = {
  id: "midnight",
  label: "Midnight",
  description: "Deep dark blues, calm and focused",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    surfaceGradient: "linear-gradient(180deg, #0a101e 0%, #141c2e 100%)",
    useGradient: true,
    borderRadius: 12,
    elevation: "subtle",
    density: "normal",
    chromeCase: "none",
    borderWeight: 1,
    headingWeight: 600,
    transitionMs: 250,
    dark: {
      primary: "#60a5fa", secondary: "#818cf8", tertiary: "#a78bfa",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#0a101e", surface: "#141c2e", surfaceAlt: "#1c2640",
      border: "#2a3654", highlight: "#1a2d52", accent: "#3b82f6",
      text: "#f1f5f9", textSecondary: "#94a3b8", textMuted: "#546a8a",
    },
    light: {
      primary: "#2563eb", secondary: "#4f46e5", tertiary: "#7c3aed",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#f5f8fc", surface: "#ffffff", surfaceAlt: "#edf2f9",
      border: "#d4dff0", highlight: "#e8f0fe", accent: "#3b82f6",
      text: "#0f172a", textSecondary: "#475569", textMuted: "#8896ad",
    },
  },
};

export const ocean: MoodPreset = {
  id: "ocean",
  label: "Ocean",
  description: "Teal and cyan, deep and open",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #0891b2, #2dd4bf)",
    surfaceGradient: "linear-gradient(180deg, #061214 0%, #0e1e22 100%)",
    useGradient: true,
    borderRadius: 12,
    elevation: "subtle",
    dark: {
      primary: "#22d3ee", secondary: "#2dd4bf", tertiary: "#38bdf8",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#061214", surface: "#0e1e22", surfaceAlt: "#162a30",
      border: "#244048", highlight: "#1a3038", accent: "#0891b2",
      text: "#ecfeff", textSecondary: "#67e8f9", textMuted: "#3a8a9a",
    },
    light: {
      primary: "#0891b2", secondary: "#0d9488", tertiary: "#0284c7",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#f0fdff", surface: "#ffffff", surfaceAlt: "#e0f7fa",
      border: "#b2ebf2", highlight: "#e8fcfe", accent: "#0891b2",
      text: "#0c343d", textSecondary: "#0e7490", textMuted: "#6aabb8",
    },
  },
};

export const arctic: MoodPreset = {
  id: "arctic",
  label: "Arctic",
  description: "Icy blues and crisp whites, frosty",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #38bdf8, #e0f2fe)",
    surfaceGradient: "linear-gradient(180deg, #081218 0%, #0e1c24 100%)",
    useGradient: true,
    borderRadius: 10,
    elevation: "subtle",
    dark: {
      primary: "#7dd3fc", secondary: "#bae6fd", tertiary: "#38bdf8",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#081218", surface: "#0e1c24", surfaceAlt: "#14262e",
      border: "#1e3a48", highlight: "#162e3a", accent: "#38bdf8",
      text: "#f0f9ff", textSecondary: "#7dd3fc", textMuted: "#3a7a98",
    },
    light: {
      primary: "#0284c7", secondary: "#0ea5e9", tertiary: "#0369a1",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#f0f9ff", surface: "#ffffff", surfaceAlt: "#e0f2fe",
      border: "#bae6fd", highlight: "#eaf6ff", accent: "#0284c7",
      text: "#0c4a6e", textSecondary: "#0369a1", textMuted: "#5aa0c0",
    },
  },
};
