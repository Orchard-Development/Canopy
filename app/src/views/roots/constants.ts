import type { Theme } from "@mui/material/styles";

/** Scale factor applied to raw session/seed positions for scene spread. */
export const POSITION_SCALE = 3.0;

// Fallback palette when no theme is available
export const CLUSTER_PALETTE = [
  "#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa",
  "#f472b6", "#22d3ee", "#fb923c", "#818cf8", "#2dd4bf",
  "#c084fc", "#4ade80", "#f9a8d4", "#38bdf8", "#facc15",
];

// Build a palette from the MUI theme, mixing the theme's own colors
// with enough variety for 15 clusters
export function buildPalette(theme: Theme): string[] {
  const p = theme.palette;
  return [
    p.primary.main,
    p.error.main,
    p.success.main,
    p.warning.main,
    p.secondary.main,
    p.info.main,
    p.primary.light,
    p.error.light,
    p.success.light,
    p.warning.light,
    p.secondary.light,
    p.info.light,
    p.primary.dark,
    p.error.dark,
    p.success.dark,
  ];
}

export function sessionSize(totalToolCalls: number): number {
  return Math.max(0.02, Math.min(0.1, Math.log2(totalToolCalls + 1) * 0.015));
}

export function seedSize(usageCount: number): number {
  return 0.04 + Math.log2(usageCount + 1) * 0.02;
}

// Color-code seeds by name prefix/type for visual variety
const SEED_COLORS: [RegExp, { color: string; emissive: string }][] = [
  [/^skill/i, { color: "#818cf8", emissive: "#6366f1" }],   // indigo -- skills
  [/^rule/i, { color: "#f472b6", emissive: "#ec4899" }],    // pink -- rules
  [/^template/i, { color: "#34d399", emissive: "#10b981" }], // emerald -- templates
  [/^memory/i, { color: "#22d3ee", emissive: "#06b6d4" }],   // cyan -- memory
  [/^hook/i, { color: "#c084fc", emissive: "#a855f7" }],     // purple -- hooks
];

const DEFAULT_SEED_COLOR = { color: "#fbbf24", emissive: "#f59e0b" }; // amber fallback

export function seedColor(name: string): { color: string; emissive: string } {
  for (const [pattern, colors] of SEED_COLORS) {
    if (pattern.test(name)) return colors;
  }
  // Hash-based assignment for unmatched names to spread color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % SEED_COLORS.length;
  return SEED_COLORS[idx][1];
}
