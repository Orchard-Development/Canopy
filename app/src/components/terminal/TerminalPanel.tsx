import { Box } from "@mui/material";
import { alpha, darken, useTheme } from "@mui/material/styles";
import { useTerminal } from "../../hooks/useTerminal";
import { api } from "../../lib/api";
import { PrettyTerminal } from "./PrettyTerminal";
import { TerminalInputDock } from "./TerminalInputDock";

export type RenderMode = "terminal" | "pretty";

interface Props {
  sessionId: string;
  active?: boolean;
  suspendResize?: boolean;
  renderMode?: RenderMode;
  showDock?: boolean;
  onExit?: (code: number) => void;
}

export function TerminalPanel({ sessionId, active = true, suspendResize, renderMode = "terminal", showDock = false, onExit }: Props) {
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

  const isPretty = renderMode === "pretty";
  const effectiveFocus = focused || showDock;

  return (
    <Box
      ref={dropZoneRef}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        bgcolor: termBg,
        border: effectiveFocus
          ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}`
          : `1px solid ${alpha(theme.palette.divider, isDark ? 0.15 : 0.2)}`,
        borderRadius: 1.5,
        overflow: "hidden",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        boxShadow: effectiveFocus
          ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.12)}, inset 0 1px 2px ${alpha("#000", 0.15)}`
          : `inset 0 1px 2px ${alpha("#000", isDark ? 0.15 : 0.05)}`,
      }}
    >
      {/* xterm.js — always mounted to keep WS alive, hidden in pretty mode */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
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
      {/* Pretty mode overlay -- covers xterm when active */}
      {isPretty && (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", bgcolor: termBg }}>
          <PrettyTerminal
            sessionId={sessionId}
            onSend={sendInput}
          />
        </Box>
      )}
      {/* Input dock — raw terminal only */}
      {showDock && !isPretty && <TerminalInputDock onSend={sendInput} />}
      {/* Click-to-focus overlay for raw terminal when not focused.
          Removed during active drag so file drops reach the drop zone. */}
      {!focused && !dragOver && !isPretty && !showDock && (
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
