import { useEffect, useRef } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import type { StepProps } from "./registry";

export function SetDefaultStep({
  onComplete,
  onSkip,
  state,
}: StepProps) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!state.project) {
      onSkip?.();
      return;
    }

    setDefault();
  }, []);

  async function setDefault() {
    if (!state.project) return;
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_project: state.project.id,
          default_terminal_project: state.project.id,
        }),
      });
    } catch {
      // Best-effort -- advance anyway
    }
    onComplete();
  }

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", py: 6, px: 3, textAlign: "center" }}>
      <CircularProgress sx={{ mb: 3 }} />
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Preparing your project...
      </Typography>
    </Box>
  );
}
