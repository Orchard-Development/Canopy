import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Button,
  Stack,
  TextField,
  Chip,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import BrushIcon from "@mui/icons-material/Brush";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import InsightsIcon from "@mui/icons-material/Insights";
import ExploreIcon from "@mui/icons-material/Explore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import type { StepProps, Intent } from "./registry";

interface IntentOption {
  intent: Intent;
  icon: typeof RocketLaunchIcon;
  title: string;
  subtitle: string;
}

const INTENTS: IntentOption[] = [
  {
    intent: "build",
    icon: RocketLaunchIcon,
    title: "Build & ship",
    subtitle: "Code, deploy, debug, automate",
  },
  {
    intent: "design",
    icon: BrushIcon,
    title: "Design & create",
    subtitle: "Visuals, copy, assets, content",
  },
  {
    intent: "plan",
    icon: AccountTreeIcon,
    title: "Plan & manage",
    subtitle: "Roadmaps, teams, priorities",
  },
  {
    intent: "research",
    icon: InsightsIcon,
    title: "Research & analyze",
    subtitle: "Data, reports, insights",
  },
  {
    intent: "learn",
    icon: ExploreIcon,
    title: "Learn & explore",
    subtitle: "Just getting started",
  },
];

function derivePersona(intents: Intent[]): "power-user" | "non-technical" {
  const technical: Intent[] = ["build", "research"];
  return intents.some((i) => technical.includes(i)) ? "power-user" : "non-technical";
}

export function PersonaStep({ onComplete, onBack, setState }: StepProps) {
  const [selected, setSelected] = useState<Set<Intent>>(new Set());
  const [freeform, setFreeform] = useState("");

  function toggle(intent: Intent) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(intent)) next.delete(intent);
      else next.add(intent);
      return next;
    });
  }

  function handleContinue() {
    const intents = Array.from(selected);
    const persona = derivePersona(intents);
    setState({ intents, intentFreeform: freeform.trim(), persona });
    onComplete();
  }

  const canContinue = selected.size > 0 || freeform.trim().length > 0;

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
        What will your orchard grow?
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Pick as many as you like. This shapes the agents and tools we cultivate for you.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          mb: 4,
        }}
      >
        {INTENTS.map((opt) => {
          const Icon = opt.icon;
          const active = selected.has(opt.intent);
          return (
            <Card
              key={opt.intent}
              variant="outlined"
              sx={{
                borderColor: active ? "primary.main" : "divider",
                borderWidth: active ? 2 : 1,
                transform: active ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s ease",
              }}
            >
              <CardActionArea onClick={() => toggle(opt.intent)} sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <Icon
                    sx={{
                      fontSize: 28,
                      color: active ? "primary.main" : "text.secondary",
                      mt: 0.25,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {opt.title}
                      </Typography>
                      {active && (
                        <Chip label="selected" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {opt.subtitle}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <TextField
        value={freeform}
        onChange={(e) => setFreeform(e.target.value)}
        placeholder='Something else? Tell us what you do... e.g. "I run a recording studio"'
        multiline
        rows={2}
        fullWidth
        sx={{ mb: 3 }}
      />

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={!canContinue}
          disableElevation
          size="large"
        >
          Continue
        </Button>
      </Stack>
    </Box>
  );
}
