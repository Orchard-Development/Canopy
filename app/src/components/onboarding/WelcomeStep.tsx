import { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";

import type { StepProps } from "./registry";

const LINES = [
  "One engineer. A dozen parallel agents. Unlimited output.",
  "Plant a task, watch it grow. Your orchard compounds over time.",
  "Everything runs on your machine. Your intelligence, your control.",
];

export function WelcomeStep({ onComplete }: StepProps) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers = LINES.map((_, i) =>
      setTimeout(() => setVisibleLines(i + 1), 600 + i * 800),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "ArrowRight") onComplete();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  return (
    <Box
      sx={{
        width: "100%",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontWeight: 800,
          mb: 5,
          letterSpacing: "-0.03em",
          opacity: 0,
          animation: "story-enter 0.8s ease forwards",
          textAlign: "center",
        }}
      >
        Welcome to the Orchard
      </Typography>

      <Box sx={{ mb: 6, maxWidth: 480 }}>
        {LINES.map((line, i) => (
          <Typography
            key={line}
            variant="h6"
            color="text.secondary"
            sx={{
              fontWeight: 400,
              mb: 1.5,
              textAlign: "center",
              opacity: i < visibleLines ? 1 : 0,
              transform: i < visibleLines ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {line}
          </Typography>
        ))}
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={onComplete}
        disableElevation
        sx={{
          textTransform: "none",
          fontSize: "1rem",
          px: 5,
          py: 1.5,
          opacity: visibleLines >= LINES.length ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        Plant your first seed
      </Button>
    </Box>
  );
}
