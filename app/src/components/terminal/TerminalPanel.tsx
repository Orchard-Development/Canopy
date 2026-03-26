import { Box } from "@mui/material";
import { alpha, darken, useTheme } from "@mui/material/styles";
import { useTerminal } from "../../hooks/useTerminal";
import { api } from "../../lib/api";

// NOTE: Pretty mode is disabled. The concept is kept for future reference but
// the UI toggle has been removed and the render path is hard-blocked below.
// To re-enable, restore the PrettyTerminal overlay and the toggle icons in
// TerminalCard and TerminalDrawerContent.
export type RenderMode = "terminal" | "pretty";

interface Props {
  sessionId: string;
  active?: boolean;
  suspendResize?: boolean;
  renderMode?: RenderMode;
  onExit?: (code: number) => void;
}

export function TerminalPanel({ sessionId, active = true, suspendResize, renderMode = "terminal", onExit }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { containerRef, dropZoneRef, termRef, focused, setFocused, dragOver, bufferText, sendInput } = useTerminal({
    sessionId,
    active,
    suspendResize,
    onExit,
    onInput: (id, data) => {
      if (data.includes("\r") || data.includes("\n")) {
        api.setTerminalState(id, "running").catch(() => {});
      }
    },
  });

  const termBg = isDark
    ? darken(theme.palette.background.paper, 0.25)
    : theme.palette.background.paper;

  // Pretty mode is disabled -- always render as terminal regardless of prop.
  const isPretty = false;

  return (
    <Box
      ref={dropZoneRef}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        bgcolor: termBg,
        border: focused
          ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}`
          : `1px solid ${alpha(theme.palette.divider, isDark ? 0.15 : 0.2)}`,
        borderRadius: 1.5,
        overflow: "hidden",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        boxShadow: focused
          ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.12)}, inset 0 1px 2px ${alpha("#000", 0.15)}`
          : `inset 0 1px 2px ${alpha("#000", isDark ? 0.15 : 0.05)}`,
      }}
    >
      {/* xterm.js — always mounted to keep WS alive, hidden in pretty mode */}
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
          "& .xterm": { height: "100%", p: 1 },
          "& .xterm-screen": { height: "100% !important", width: "100% !important" },
          "& .xterm-viewport::-webkit-scrollbar": { width: 6 },
          "& .xterm-viewport::-webkit-scrollbar-track": { background: "transparent" },
          "& .xterm-viewport::-webkit-scrollbar-thumb": {
            background: alpha(theme.palette.primary.main, 0.2),
            borderRadius: 3,
            "&:hover": { background: alpha(theme.palette.primary.main, 0.35) },
          },
        }}
      />
      {/* Pretty mode disabled -- see note at top of file */}
      {!focused && !isPretty && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            cursor: "pointer",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            termRef.current?.focus();
          }}
        />
      )}
      {dragOver && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            border: "2px dashed",
            borderColor: "primary.main",
            borderRadius: 1,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <Box
            component="span"
            sx={{
              color: "primary.main",
              fontSize: 14,
              fontFamily: "monospace",
              fontWeight: 600,
              px: 2,
              py: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              borderRadius: 1,
            }}
          >
            Drop to paste path
          </Box>
        </Box>
      )}
    </Box>
  );
}
