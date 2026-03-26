import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Button,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WebIcon from "@mui/icons-material/Web";
import TerminalIcon from "@mui/icons-material/Terminal";
import DashboardIcon from "@mui/icons-material/Dashboard";

import type { StepProps } from "./registry";

type CliTool = "claude" | "codex";

interface SeedOption {
  id: string;
  name: string;
  problem: string;
  description: string;
  icon: React.ReactNode;
}

const SEED_OPTIONS: SeedOption[] = [
  {
    id: "landing-page",
    name: "landing-page",
    problem: "Build a personal landing page I can deploy and share",
    description:
      "A polished site to showcase your work -- ready to go live in minutes.",
    icon: <WebIcon sx={{ fontSize: 36 }} />,
  },
  {
    id: "cli-tool",
    name: "cli-tool",
    problem: "Create a CLI productivity tool that automates a daily workflow",
    description:
      "A command-line utility that saves you time on something you do every day.",
    icon: <TerminalIcon sx={{ fontSize: 36 }} />,
  },
  {
    id: "live-dashboard",
    name: "live-dashboard",
    problem: "Design a live dashboard that visualizes data I care about",
    description:
      "A real-time dashboard that pulls in data and keeps you informed at a glance.",
    icon: <DashboardIcon sx={{ fontSize: 36 }} />,
  },
];

export function ProblemStep({
  onComplete,
  onBack,
  state,
  setState,
}: StepProps) {
  const availableTools = state.cliTools;
  const defaultTool: CliTool = availableTools.claude ? "claude" : "codex";
  const [tool, setTool] = useState<CliTool>(defaultTool);
  const bothAvailable = availableTools.claude && availableTools.codex;

  function select(option: SeedOption) {
    setState({
      problem: { text: option.problem, name: option.name },
      selectedTool: tool,
    });
    onComplete();
  }

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", py: 6, px: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 3, textTransform: "none" }}
      >
        Back
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Plant your first seed
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Pick a starter project. Your agents will draft a proposal and get to
        work.
      </Typography>

      {bothAvailable && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Generate with:
          </Typography>
          <ToggleButtonGroup
            value={tool}
            exclusive
            onChange={(_, v) => v && setTool(v)}
            size="small"
          >
            <ToggleButton value="claude">Claude Code</ToggleButton>
            <ToggleButton value="codex">Codex</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <Stack spacing={2}>
        {SEED_OPTIONS.map((opt) => (
          <Card key={opt.id} variant="outlined">
            <CardActionArea
              onClick={() => select(opt)}
              sx={{
                p: 3,
                display: "flex",
                alignItems: "flex-start",
                gap: 2.5,
              }}
            >
              <Box sx={{ color: "primary.main", mt: 0.5 }}>{opt.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {opt.problem}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {opt.description}
                </Typography>
              </Box>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
