import type { MoodPreset } from "./index";
import { BASE } from "./base";

export const aurora: MoodPreset = {
  id: "aurora",
  label: "Aurora",
  description: "Northern lights -- green to violet shimmer",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #10b981, #8b5cf6)",
    surfaceGradient: "linear-gradient(160deg, #060e12 0%, #0c1420 50%, #110e1e 100%)",
    useGradient: true,
    borderRadius: 12,
    elevation: "subtle",
    dark: {
      primary: "#34d399", secondary: "#a78bfa", tertiary: "#38bdf8",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#060e12", surface: "#0e181e", surfaceAlt: "#141e2a",
      border: "#1e3040", highlight: "#0f2a28", accent: "#10b981",
      text: "#ecfdf5", textSecondary: "#6ee7b7", textMuted: "#3a7a6a",
    },
    light: {
      primary: "#059669", secondary: "#7c3aed", tertiary: "#0284c7",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#f0fdf4", surface: "#ffffff", surfaceAlt: "#ecfdf5",
      border: "#bbf7d0", highlight: "#dcfce7", accent: "#059669",
      text: "#064e3b", textSecondary: "#047857", textMuted: "#6ab8a0",
    },
  },
};

export const amethyst: MoodPreset = {
  id: "amethyst",
  label: "Amethyst",
  description: "Rich purple and lavender, regal",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #c084fc, #9333ea)",
    surfaceGradient: "linear-gradient(180deg, #120a1a 0%, #1c1228 100%)",
    useGradient: true,
    borderRadius: 12,
    elevation: "subtle",
    dark: {
      primary: "#c084fc", secondary: "#a78bfa", tertiary: "#d8b4fe",
      success: "#4ade80", warning: "#fbbf24", error: "#f87171",
      background: "#120a1a", surface: "#1c1228", surfaceAlt: "#261a34",
      border: "#3a2850", highlight: "#2e1e42", accent: "#9333ea",
      text: "#f3e8ff", textSecondary: "#c4a0f0", textMuted: "#6a4a90",
    },
    light: {
      primary: "#7e22ce", secondary: "#9333ea", tertiary: "#6b21a8",
      success: "#16a34a", warning: "#d97706", error: "#dc2626",
      background: "#faf5ff", surface: "#ffffff", surfaceAlt: "#f3e8ff",
      border: "#d8b4fe", highlight: "#f5f0ff", accent: "#9333ea",
      text: "#3b0764", textSecondary: "#6b21a8", textMuted: "#9a78c0",
    },
  },
};

export const neon: MoodPreset = {
  id: "neon",
  label: "Neon",
  description: "Electric neon on black, high energy",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #00ffcc, #ff00aa)",
    surfaceGradient: "linear-gradient(180deg, #050508 0%, #0a0a10 100%)",
    useGradient: true,
    borderRadius: 10,
    elevation: "raised",
    dark: {
      primary: "#00ffcc", secondary: "#00ccff", tertiary: "#ff00aa",
      success: "#00ff88", warning: "#ffcc00", error: "#ff3366",
      background: "#050508", surface: "#0a0a10", surfaceAlt: "#10101a",
      border: "#1a1a30", highlight: "#0e1420", accent: "#ff00aa",
      text: "#e8f0ff", textSecondary: "#80e0d0", textMuted: "#3a6a60",
    },
    light: {
      primary: "#008866", secondary: "#0088aa", tertiary: "#cc0088",
      success: "#059669", warning: "#d97706", error: "#dc2626",
      background: "#f0fff8", surface: "#ffffff", surfaceAlt: "#e0fff4",
      border: "#a0e8d8", highlight: "#f0fff8", accent: "#cc0088",
      text: "#0a2a20", textSecondary: "#106050", textMuted: "#60a898",
    },
  },
};

export const highcon: MoodPreset = {
  id: "highcon",
  label: "High Contrast",
  description: "Maximum contrast, accessibility first",
  config: {
    ...BASE,
    accentGradient: "linear-gradient(135deg, #ffcc00, #ffffff)",
    useGradient: false,
    borderRadius: 4,
    elevation: "flat",
    density: "compact",
    chromeCase: "uppercase",
    borderWeight: 2,
    headingWeight: 700,
    transitionMs: 150,
    dark: {
      primary: "#ffffff", secondary: "#ffcc00", tertiary: "#00ccff",
      success: "#00ff00", warning: "#ffcc00", error: "#ff3333",
      background: "#000000", surface: "#0a0a0a", surfaceAlt: "#141414",
      border: "#555555", highlight: "#1a1a1a", accent: "#ffcc00",
      text: "#ffffff", textSecondary: "#cccccc", textMuted: "#888888",
    },
    light: {
      primary: "#000000", secondary: "#0000cc", tertiary: "#006600",
      success: "#006600", warning: "#884400", error: "#cc0000",
      background: "#ffffff", surface: "#ffffff", surfaceAlt: "#f0f0f0",
      border: "#333333", highlight: "#f5f5f5", accent: "#0000cc",
      text: "#000000", textSecondary: "#222222", textMuted: "#555555",
    },
  },
};
