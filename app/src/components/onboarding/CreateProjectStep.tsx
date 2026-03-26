import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from "@mui/material";
import { api } from "../../lib/api";
import type { StepProps, Intent } from "./registry";

function inferProjectType(
  intents: Intent[],
): "software" | "operations" | "research" | "mixed" {
  if (intents.includes("build")) return "software";
  if (intents.includes("research")) return "research";
  if (intents.includes("plan")) return "operations";
  return "mixed";
}

async function detectHome(): Promise<string> {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.home) return data.home;
  } catch {
    /* fall through */
  }
  return "~";
}

export function CreateProjectStep({
  onComplete,
  onSkip,
  state,
  setState,
}: StepProps) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (state.project) {
      onComplete();
      return;
    }

    createOrchardProject();
  }, []);

  async function createOrchardProject() {
    try {
      const homedir = await detectHome();
      const rootPath = `${homedir}/orchard-projects/orchard`;
      const projectType = inferProjectType(state.intents);

      const project = await api.createProject({
        name: "Orchard",
        description: "Your personal AI workspace",
        rootPath,
        projectType,
      });

      setState({ project });
      onComplete();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create project";
      setError(msg);
    }
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 560, mx: "auto", py: 6, px: 3, textAlign: "center" }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            disableElevation
            onClick={() => {
              setError(null);
              createOrchardProject();
            }}
          >
            Retry
          </Button>
          {onSkip && (
            <Button onClick={onSkip} sx={{ textTransform: "none" }}>
              Skip
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", py: 6, px: 3, textAlign: "center" }}>
      <CircularProgress sx={{ mb: 3 }} />
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Setting up your workspace...
      </Typography>
    </Box>
  );
}
