import { createTheme, type Theme, type Components } from "@mui/material/styles";
import type { BrandingConfig, ElevationLevel, PaletteConfig } from "./branding";
import { resolveAccent } from "./branding";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function elevationComponents(
  mode: "dark" | "light",
  level: ElevationLevel,
  palette: PaletteConfig,
): Components<Theme> {
  const isDark = mode === "dark";
  const accent = palette.accent ?? palette.primary;

  if (level === "flat") {
    return {
      MuiCard: {
        defaultProps: { variant: "outlined" as const },
        styleOverrides: { root: { backgroundImage: "none", boxShadow: "none" } },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiPaper: {
        styleOverrides: { root: { boxShadow: "none" } },
      },
      MuiButton: {
        styleOverrides: { contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } } },
      },
    };
  }

  const isRaised = level === "raised";

  // Raised uses accent-tinted shadows so they're visible on dark backgrounds
  const restShadow = isRaised
    ? isDark
      ? `0 4px 16px ${hexToRgba(accent, 0.2)}, 0 2px 6px rgba(0,0,0,0.5)`
      : `0 4px 16px ${hexToRgba(accent, 0.1)}, 0 2px 6px rgba(0,0,0,0.08)`
    : isDark
      ? "0 1px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)"
      : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)";

  const hoverShadow = isRaised
    ? isDark
      ? `0 8px 30px ${hexToRgba(accent, 0.3)}, 0 4px 12px rgba(0,0,0,0.6)`
      : `0 8px 30px ${hexToRgba(accent, 0.15)}, 0 4px 12px rgba(0,0,0,0.1)`
    : isDark
      ? `0 4px 14px ${hexToRgba(accent, 0.12)}, 0 2px 4px rgba(0,0,0,0.5)`
      : "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)";

  // Raised mode: fade the border so shadows dominate
  const borderStyle = isRaised
    ? { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }
    : {};

  return {
    MuiCard: {
      defaultProps: { variant: "outlined" as const },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: restShadow,
          transition: "box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease",
          ...borderStyle,
          "&:hover": isRaised
            ? { boxShadow: hoverShadow, transform: "translateY(-2px)" }
            : {},
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backdropFilter: "blur(12px)",
          backgroundColor: hexToRgba(palette.background, 0.8),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: isRaised ? { boxShadow: restShadow, ...borderStyle } : {},
        elevation1: { boxShadow: restShadow },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: isRaised
          ? {
              boxShadow: restShadow,
              "&:hover": { boxShadow: hoverShadow },
            }
          : {
              boxShadow: "none",
              "&:hover": { boxShadow: restShadow },
            },
      },
    },
  };
}

function buildMode(
  mode: "dark" | "light",
  cfg: BrandingConfig,
): Theme {
  const p = mode === "dark" ? cfg.dark : cfg.light;
  const borderRadius = cfg.borderRadius;
  const elevation = cfg.elevation ?? "subtle";
  const gradient = cfg.useGradient ? cfg.accentGradient : undefined;
  const accent = resolveAccent(cfg, mode);
  const accentColor = p.accent ?? p.primary;
  const isDark = mode === "dark";

  // Structural personality -- read from config with sensible defaults
  const chromeCase = cfg.chromeCase ?? "none";
  const headingWeight = cfg.headingWeight ?? 600;
  const bw = cfg.borderWeight ?? 1;
  const ms = cfg.transitionMs ?? 200;
  const density = cfg.density ?? "normal";

  const ct = chromeCase === "uppercase" ? ("uppercase" as const) : ("none" as const);
  const cw = chromeCase === "uppercase" ? 700 : 500;
  const cs = chromeCase === "uppercase" ? "0.04em" : undefined;
  const ta = `all ${ms}ms ease-out`;

  const gradientButton = gradient ? {
    background: gradient,
    color: "#ffffff",
    "&:hover": {
      background: gradient,
      filter: "brightness(1.1)",
    },
  } : {};

  return createTheme({
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h4: { fontWeight: headingWeight, letterSpacing: "-0.01em" },
      h5: { fontWeight: headingWeight, letterSpacing: "-0.01em" },
      h6: { fontWeight: headingWeight, letterSpacing: "-0.01em" },
      button: { textTransform: ct, fontWeight: cw, letterSpacing: cs },
      ...(chromeCase === "uppercase" ? {
        caption: { textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 500 },
        overline: { letterSpacing: "0.12em", fontWeight: 700 },
      } : {}),
    },
    shape: { borderRadius },
    transitions: {
      duration: {
        shortest: Math.round(ms * 0.5),
        shorter: Math.round(ms * 0.75),
        standard: ms,
        complex: Math.round(ms * 1.5),
      },
    },
    palette: {
      mode,
      primary: { main: p.primary },
      secondary: { main: p.secondary },
      success: { main: p.success },
      warning: { main: p.warning },
      error: { main: p.error },
      info: { main: p.tertiary ?? p.secondary },
      background: { default: p.background, paper: p.surface },
      text: { primary: p.text, secondary: p.textSecondary, disabled: p.textMuted ?? p.textSecondary },
      divider: p.border ?? hexToRgba(p.text, 0.12),
      action: {
        hover: hexToRgba(p.highlight ?? p.primary, 0.08),
        selected: hexToRgba(p.highlight ?? p.primary, 0.14),
        focus: hexToRgba(p.accent ?? p.primary, 0.12),
      },
    },
    components: {
      ...elevationComponents(mode, elevation, p),
      MuiCssBaseline: {
        styleOverrides: gradient ? {
          "*::-webkit-scrollbar": { width: 8 },
          "*::-webkit-scrollbar-track": { background: "transparent" },
          "*::-webkit-scrollbar-thumb": {
            background: hexToRgba(accentColor, 0.25),
            borderRadius: 4,
            "&:hover": { background: hexToRgba(accentColor, 0.4) },
          },
        } : {},
      },
      MuiChip: {
        ...(density === "compact" ? { defaultProps: { size: "small" as const } } : {}),
        styleOverrides: {
          root: { fontWeight: cw, textTransform: ct, letterSpacing: cs },
          filled: gradient ? {
            background: gradient,
            color: "#ffffff",
          } : {},
        },
      },
      MuiButton: {
        ...(density === "compact" ? { defaultProps: { size: "small" as const } } : {}),
        styleOverrides: {
          root: {
            textTransform: ct,
            fontWeight: cw,
            letterSpacing: cs,
            transition: ta,
          },
          contained: {
            ...gradientButton,
            ...(elevationComponents(mode, elevation, p).MuiButton?.styleOverrides as Record<string, unknown>)?.contained as object,
          },
          outlined: {
            borderWidth: bw,
            "&:hover": {
              borderWidth: bw,
              ...(gradient ? {
                borderColor: accentColor,
                backgroundColor: hexToRgba(accentColor, 0.08),
              } : {}),
            },
            ...(gradient ? {
              borderColor: hexToRgba(accentColor, 0.4),
            } : {}),
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              backgroundColor: hexToRgba(accentColor, 0.14),
              borderLeft: gradient ? "3px solid" : undefined,
              borderImage: gradient ? `${gradient} 1` : undefined,
              "&:hover": {
                backgroundColor: hexToRgba(accentColor, 0.2),
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "blur(12px)",
            backgroundColor: hexToRgba(p.background, 0.85),
            borderBottom: gradient
              ? `1px solid ${hexToRgba(accentColor, isDark ? 0.2 : 0.12)}`
              : `${bw}px solid ${p.border ?? hexToRgba(p.text, 0.08)}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: p.surfaceAlt ?? p.surface,
            backgroundImage: cfg.useGradient
              ? `linear-gradient(180deg, ${hexToRgba(accentColor, 0.05)} 0%, transparent 40%)`
              : "none",
          },
        },
      },
      MuiCard: {
        ...(elevationComponents(mode, elevation, p).MuiCard ?? {}),
        styleOverrides: {
          ...(elevationComponents(mode, elevation, p).MuiCard?.styleOverrides ?? {}),
          root: {
            ...(elevationComponents(mode, elevation, p).MuiCard?.styleOverrides as Record<string, unknown>)?.root as object,
            ...(gradient ? {
              borderTop: `1px solid ${hexToRgba(accentColor, isDark ? 0.15 : 0.1)}`,
            } : {}),
          },
        },
      },
      MuiOutlinedInput: {
        ...(density === "compact" ? { defaultProps: { size: "small" as const } } : {}),
        styleOverrides: gradient ? {
          root: {
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: accentColor,
              borderWidth: 2,
              boxShadow: `0 0 0 3px ${hexToRgba(accentColor, 0.12)}`,
            },
          },
        } : {},
      },
      MuiSwitch: {
        styleOverrides: gradient ? {
          switchBase: {
            "&.Mui-checked + .MuiSwitch-track": {
              background: gradient,
              opacity: 1,
            },
          },
        } : {},
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:nth-of-type(odd)": {
              backgroundColor: hexToRgba(p.surfaceAlt ?? p.surface, 0.5),
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: chromeCase === "uppercase" ? {
          root: {
            "& .MuiTableCell-head": {
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              fontWeight: 700,
              fontSize: "0.75rem",
            },
          },
        } : {},
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: chromeCase === "uppercase" ? {
            backgroundColor: isDark ? p.text : p.background,
            color: isDark ? p.background : p.text,
            border: `1px solid ${p.border ?? hexToRgba(p.text, 0.12)}`,
            borderRadius: 0,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
            fontSize: "0.65rem",
          } : {
            backgroundColor: p.surfaceAlt ?? p.surface,
            color: p.text,
            border: `1px solid ${p.border ?? hexToRgba(p.text, 0.12)}`,
            backdropFilter: "blur(8px)",
            fontSize: "0.75rem",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          bar: gradient ? { background: gradient } : {},
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: ct,
            fontWeight: cw,
            letterSpacing: cs,
            transition: ta,
            "&.Mui-selected": {
              color: accentColor,
              backgroundImage: gradient
                ? `linear-gradient(180deg, transparent 90%, ${accent})`
                : "none",
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: ct,
            fontWeight: cw >= 700 ? 600 : 500,
            letterSpacing: cs,
            transition: ta,
            ...(gradient ? {
              "&.Mui-selected": {
                backgroundColor: hexToRgba(accentColor, 0.14),
                color: accentColor,
                borderColor: hexToRgba(accentColor, 0.4),
                "&:hover": {
                  backgroundColor: hexToRgba(accentColor, 0.2),
                },
              },
            } : {}),
          },
        },
      },
    },
  });
}

export function buildThemes(cfg: BrandingConfig): { dark: Theme; light: Theme } {
  return {
    dark: buildMode("dark", cfg),
    light: buildMode("light", cfg),
  };
}

export function getInitialMode(): "light" | "dark" {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("theme");
  if (fromParam === "light" || fromParam === "dark") return fromParam;

  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}
