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
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { api, type SkillCandidate } from "../../lib/api";

interface Props {
  candidates: SkillCandidate[];
  onAction: () => void;
}

export function SkillCandidateCard({ candidates, onAction }: Props) {
  const [drafting, setDrafting] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  async function handleDraft(id: string) {
    setDrafting(id);
    try {
      await api.draftSynthesisCandidate(id);
      onAction();
    } finally {
      setDrafting(null);
    }
  }

  async function handleApprove(id: string) {
    setApproving(id);
    try {
      await api.approveSynthesisCandidate(id);
      onAction();
    } finally {
      setApproving(null);
    }
  }

  async function handleReject(id: string) {
    await api.rejectSynthesisCandidate(id);
    onAction();
  }

  return (
    <Card sx={{ mb: 3, border: "1px solid", borderColor: "secondary.main" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <AutoAwesomeIcon color="secondary" />
          <Typography variant="h6">Skill Synthesis Candidates</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These sessions demonstrated reusable patterns that may be worth encoding as skills.
        </Typography>
        <Stack spacing={1}>
          {candidates.map((item) => (
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
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.status}
                    size="small"
                    variant="outlined"
                    color={item.status === "drafting" ? "info" : "default"}
                  />
                </Stack>
                {item.description && (
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                )}
              </Box>
              {item.status === "pending" && (
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  disabled={drafting === item.id}
                  onClick={() => handleDraft(item.id)}
                >
                  {drafting === item.id ? "Drafting…" : "Draft"}
                </Button>
              )}
              {item.status === "drafting" && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disableElevation
                  disabled={approving === item.id}
                  onClick={() => handleApprove(item.id)}
                >
                  {approving === item.id ? "Approving…" : "Approve"}
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleReject(item.id)}
              >
                Reject
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
