import { Box } from "@mui/material";
import { keyframes } from "@mui/system";

export type SessionState = "running" | "waiting" | "idle";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const STATE_COLORS: Record<SessionState, string> = {
  running: "#42a5f5",
  waiting: "#ffb74d",
  idle: "#9e9e9e",
};

interface Props {
  state?: SessionState;
  size?: number;
}

export function SessionStateDot({ state, size = 8 }: Props) {
  const resolved = state ?? "idle";
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: STATE_COLORS[resolved],
        flexShrink: 0,
        animation: resolved === "running" ? `${pulse} 2s ease-in-out infinite` : "none",
      }}
    />
  );
}
