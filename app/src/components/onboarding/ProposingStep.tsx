import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { TerminalPanel } from "../terminal/TerminalPanel";

interface Props {
  sessionId: string;
  tool: "claude" | "codex";
  onTransition: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

const EXIT_DURATION = 500;

export function ProposingStep({ sessionId, tool, onTransition }: Props) {
  const [exiting, setExiting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  function handleSessionExit() {
    setSessionDone(true);
  }

  function handleClick() {
    setExiting(true);
    setTimeout(onTransition, EXIT_DURATION);
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 800,
        mx: "auto",
        py: 4,
        px: 3,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        transition: `opacity ${EXIT_DURATION}ms ease, transform ${EXIT_DURATION}ms ease`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateX(40%)" : "translateX(0)",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Creating your first proposal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {sessionDone
          ? "Your proposal is ready."
          : `${TOOL_LABELS[tool]} is analyzing your problem and writing a design proposal. This will keep running in the background.`}
      </Typography>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 2,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
        }}
      >
        <TerminalPanel sessionId={sessionId} onExit={handleSessionExit} />
      </Box>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        {sessionDone && (
          <CheckCircleIcon
            sx={{
              fontSize: 40,
              color: "success.main",
              mb: 1,
              animation: "story-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {sessionDone
            ? "Your proposal is ready to review. Head to the dashboard to see it."
            : "Agent sessions live in the Terminal Drawer on the right side of the app. Let's head there now so you can keep watching."}
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<OpenInNewIcon />}
          onClick={handleClick}
          disabled={exiting}
          sx={{ textTransform: "none", fontWeight: 600, px: 4 }}
        >
          {sessionDone ? "Go to Dashboard" : "Open in Terminal Drawer"}
        </Button>
      </Box>
    </Box>
  );
}
