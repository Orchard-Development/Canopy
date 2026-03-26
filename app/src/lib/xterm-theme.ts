import { alpha, darken, lighten, type Theme } from "@mui/material/styles";

/**
 * Hand-tuned ANSI palettes that complement the app theme while providing
 * distinct, readable colors for every slot. Each color is chosen for contrast
 * against the terminal background and visual separation from its neighbors.
 */
const DARK_ANSI = {
  black:         "#1a1e2e",
  red:           "#ff6b6b",
  green:         "#69db7c",
  yellow:        "#ffd43b",
  blue:          "#74c0fc",
  magenta:       "#da77f2",
  cyan:          "#66d9e8",
  white:         "#c1c8d6",
  brightBlack:   "#505872",
  brightRed:     "#ff8787",
  brightGreen:   "#8ce99a",
  brightYellow:  "#ffe066",
  brightBlue:    "#a5d8ff",
  brightMagenta: "#e599f7",
  brightCyan:    "#99e9f2",
  brightWhite:   "#f1f3f5",
};

const LIGHT_ANSI = {
  black:         "#2e3440",
  red:           "#c92a2a",
  green:         "#2b8a3e",
  yellow:        "#e67700",
  blue:          "#1864ab",
  magenta:       "#862e9c",
  cyan:          "#0b7285",
  white:         "#868e96",
  brightBlack:   "#6b7280",
  brightRed:     "#e03131",
  brightGreen:   "#37b24d",
  brightYellow:  "#f08c00",
  brightBlue:    "#1c7ed6",
  brightMagenta: "#9c36b5",
  brightCyan:    "#1098ad",
  brightWhite:   "#212529",
};

export function createTerminalTheme(theme: Theme) {
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const bg = isDark ? darken(palette.background.paper, 0.25) : palette.background.paper;
  const ansi = isDark ? DARK_ANSI : LIGHT_ANSI;

  return {
    background: bg,
    foreground: isDark ? "#c9d1d9" : "#24292f",
    cursor: palette.primary.main,
    cursorAccent: bg,
    selectionBackground: alpha(palette.primary.main, isDark ? 0.35 : 0.22),
    selectionForeground: undefined,
    selectionInactiveBackground: alpha(palette.primary.main, isDark ? 0.18 : 0.1),
    ...ansi,
  };
}

export function terminalOptions(theme: Theme) {
  return {
    theme: createTerminalTheme(theme),
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 14,
    lineHeight: 1.35,
    letterSpacing: 0.3,
    cursorBlink: true,
    cursorStyle: "bar" as const,
    cursorWidth: 2,
    cursorInactiveStyle: "outline" as const,
    smoothScrollDuration: 80,
    allowProposedApi: true,
    scrollback: 5000,
  };
}
