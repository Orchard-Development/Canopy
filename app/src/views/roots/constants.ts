import type { Theme } from "@mui/material/styles";

/** Scale factor applied to raw session/seed positions for scene spread. */
export const POSITION_SCALE = 3.0;

/** Build a session cluster palette from the MUI theme.
 *  Canvas is always dark, so prefer light/main variants for visibility. */
export function buildPalette(theme: Theme): string[] {
  const p = theme.palette;
  return [
    p.primary.light,
    p.error.light,
    p.success.light,
    p.warning.light,
    p.secondary.light,
    p.info.light,
    p.primary.main,
    p.error.main,
    p.success.main,
    p.warning.main,
    p.secondary.main,
    p.info.main,
    p.primary.dark,
    p.error.dark,
    p.success.dark,
  ];
}

/** Theme-derived colors for the 3D scene overlaid on a transparent canvas. */
export interface SceneColors {
  keyLight: string;
  fillLight: string;
  rimLight: string;
  accentLightA: string;
  accentLightB: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipAccent: string;
  textOutline: string;
}

export function buildSceneColors(theme: Theme): SceneColors {
  const p = theme.palette;
  return {
    keyLight: p.primary.light,
    fillLight: p.primary.main,
    rimLight: p.warning.main,
    accentLightA: p.secondary.main,
    accentLightB: p.info.main,
    tooltipBg: p.background.paper,
    tooltipBorder: p.divider,
    tooltipText: p.text.primary,
    tooltipAccent: p.primary.main,
    textOutline: p.background.default,
  };
}

export function sessionSize(totalToolCalls: number): number {
  return Math.max(0.15, Math.min(0.5, Math.log2(totalToolCalls + 1) * 0.08));
}

export function seedSize(usageCount: number): number {
  return 0.2 + Math.log2(usageCount + 1) * 0.1;
}

/** Build seed type colors from theme palette.
 *  Must match the cluster palette order: 0=session(primary), 1=memory(error),
 *  2=proposal(success), 3=skill(warning), 4=rule(secondary). */
export function buildSeedTypeColors(theme: Theme): [RegExp, { color: string; emissive: string }][] {
  const p = theme.palette;
  return [
    [/^skill/i, { color: p.warning.light, emissive: p.warning.main }],
    [/^rule/i, { color: p.secondary.light, emissive: p.secondary.main }],
    [/^memory/i, { color: p.error.light, emissive: p.error.main }],
    [/^template/i, { color: p.success.light, emissive: p.success.main }],
    [/^hook/i, { color: p.info.light, emissive: p.info.main }],
  ];
}

const FALLBACK_COLOR = { color: "#fbbf24", emissive: "#f59e0b" };

export function seedColor(
  name: string,
  seedTypeColors?: [RegExp, { color: string; emissive: string }][],
): { color: string; emissive: string } {
  const colors = seedTypeColors ?? [];
  for (const [pattern, c] of colors) {
    if (pattern.test(name)) return c;
  }
  if (colors.length === 0) return FALLBACK_COLOR;
  // Hash-based assignment for unmatched names
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx][1];
}
