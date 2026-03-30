import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Box,
  Chip,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { api, type SkillImprovement } from "../../lib/api";

interface Props {
  improvements: SkillImprovement[];
  onAction: () => void;
}

export function SkillImprovementCard({ improvements, onAction }: Props) {
  const [applying, setApplying] = useState<string | null>(null);

  if (improvements.length === 0) return null;

  async function handleApply(id: string) {
    setApplying(id);
    try {
      await api.applySkillImprovement(id);
      onAction();
    } finally {
      setApplying(null);
    }
  }

  async function handleDismiss(id: string) {
    await api.dismissSkillImprovement(id);
    onAction();
  }

  return (
    <Card sx={{ mb: 3, border: "1px solid", borderColor: "info.main" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <AutoFixHighIcon color="info" />
          <Typography variant="h6">Skill Improvement Suggestions</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The quality sweep detected drift between skill documentation and actual usage.
        </Typography>
        <Stack spacing={1}>
          {improvements.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                bgcolor: "action.hover",
                px: 1.5,
                py: 1,
                borderRadius: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                    {item.skill_name}
                  </Typography>
                  <Chip
                    label={`${Object.keys(item.replacement_sections).length} section(s)`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                {item.drift_summary && (
                  <Typography variant="caption" color="text.secondary">
                    {item.drift_summary}
                  </Typography>
                )}
              </Box>
              <Button
                size="small"
                variant="contained"
                color="info"
                disableElevation
                disabled={applying === item.id}
                onClick={() => handleApply(item.id)}
              >
                {applying === item.id ? "Applying…" : "Apply"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleDismiss(item.id)}
              >
                Dismiss
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
