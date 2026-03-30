import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { StreamingState } from "../../hooks/useStreamingText";

interface Props {
  text: string;
  state: StreamingState;
}

/**
 * In-flight assistant text bubble for pretty mode streaming.
 *
 * Renders plain monospace text (not markdown) to avoid O(n) re-parsing on
 * every chunk. Shows a blinking cursor while streaming; hides it at stop.
 * Stays visible in stop state until PrettyTerminal swaps in committed entries.
 * Renders null when idle.
 */
export function StreamingAssistantBubble({ text, state }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (state === "idle") return null;

  const assistantBg = isDark
    ? alpha(theme.palette.background.paper, 0.6)
    : theme.palette.background.default;

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.5 }}>
      <Box
        sx={{
          maxWidth: "90%",
          bgcolor: assistantBg,
          borderRadius: "16px 16px 16px 4px",
          px: 2,
          py: 1,
          border: 1,
          borderColor: `rgba(255,255,255,${isDark ? 0.06 : 0.15})`,
          boxShadow: `0 1px 2px rgba(0,0,0,${isDark ? 0.2 : 0.06})`,
          fontFamily: "monospace",
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
        {state === "streaming" && (
          <Box
            component="span"
            sx={{
              display: "inline-block",
              width: "0.55em",
              ml: "1px",
              verticalAlign: "text-bottom",
              "@keyframes blink": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0 },
              },
              animation: "blink 1s step-end infinite",
            }}
          >
            ▋
          </Box>
        )}
      </Box>
    </Box>
  );
}
