import { createContext, useContext } from "react";

export interface PaletteConfig {
  primary: string;
  secondary: string;
  tertiary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  highlight: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
}

export type ElevationLevel = "flat" | "subtle" | "raised";

export type Density = "compact" | "normal" | "spacious";
export type ChromeCase = "uppercase" | "none";

export interface BrandingConfig {
  name: string;
  subtitle: string;
  accentGradient: string;
  surfaceGradient?: string;
  useGradient: boolean;
  borderRadius: number;
  elevation: ElevationLevel;
  dark: PaletteConfig;
  light: PaletteConfig;
  density?: Density;
  chromeCase?: ChromeCase;
  borderWeight?: 1 | 2;
  headingWeight?: 600 | 700 | 800;
  transitionMs?: number;
}

declare const __BRAND_NAME__: string;
declare const __BRAND_SUBTITLE__: string;

export const DEFAULT_BRANDING: BrandingConfig = {
  name: typeof __BRAND_NAME__ !== "undefined" ? __BRAND_NAME__ : "Orchard",
  subtitle: typeof __BRAND_SUBTITLE__ !== "undefined" ? __BRAND_SUBTITLE__ : "Command Center",
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
    primary: "#ffffff",
    secondary: "#ffcc00",
    tertiary: "#00ccff",
    success: "#00ff00",
    warning: "#ffcc00",
    error: "#ff3333",
    background: "#000000",
    surface: "#0a0a0a",
    surfaceAlt: "#141414",
    border: "#555555",
    highlight: "#1a1a1a",
    accent: "#ffcc00",
    text: "#ffffff",
    textSecondary: "#cccccc",
    textMuted: "#888888",
  },
  light: {
    primary: "#000000",
    secondary: "#0000cc",
    tertiary: "#006600",
    success: "#006600",
    warning: "#884400",
    error: "#cc0000",
    background: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#f0f0f0",
    border: "#333333",
    highlight: "#f5f5f5",
    accent: "#0000cc",
    text: "#000000",
    textSecondary: "#222222",
    textMuted: "#555555",
  },
};

declare global {
  interface Window {
    __CTX_BRANDING__?: BrandingConfig;
  }
}

export const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

type BrandingSetter = (cfg: BrandingConfig) => void;
export const SetBrandingContext = createContext<BrandingSetter>(() => {});

export function useBranding(): BrandingConfig {
  return useContext(BrandingContext);
}

export function useSetBranding(): BrandingSetter {
  return useContext(SetBrandingContext);
}

export function resolveAccent(cfg: BrandingConfig, mode: "dark" | "light"): string {
  if (cfg.useGradient) return cfg.accentGradient;
  const p = mode === "dark" ? cfg.dark : cfg.light;
  return p.primary;
}

export function resolveSurfaceGradient(cfg: BrandingConfig, mode: "dark" | "light"): string | undefined {
  if (!cfg.useGradient) return undefined;
  if (cfg.surfaceGradient) return cfg.surfaceGradient;
  const p = mode === "dark" ? cfg.dark : cfg.light;
  return `linear-gradient(180deg, ${p.background} 0%, ${p.surfaceAlt} 100%)`;
}

function mergeWithDefaults(partial: Partial<BrandingConfig>): BrandingConfig {
  return {
    ...DEFAULT_BRANDING,
    ...partial,
    useGradient: partial.useGradient ?? DEFAULT_BRANDING.useGradient,
    elevation: partial.elevation ?? DEFAULT_BRANDING.elevation,
    dark: { ...DEFAULT_BRANDING.dark, ...(partial.dark ?? {}) },
    light: { ...DEFAULT_BRANDING.light, ...(partial.light ?? {}) },
  };
}

export async function fetchBranding(): Promise<BrandingConfig> {
  if (window.__CTX_BRANDING__) return mergeWithDefaults(window.__CTX_BRANDING__);

  try {
    const res = await fetch("/api/branding");
    if (!res.ok) return DEFAULT_BRANDING;
    const data = await res.json();
    const merged = mergeWithDefaults(data);
    window.__CTX_BRANDING__ = merged;
    return merged;
  } catch {
    return DEFAULT_BRANDING;
  }
}
