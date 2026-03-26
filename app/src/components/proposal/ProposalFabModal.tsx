import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import DescriptionIcon from "@mui/icons-material/Description";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { api } from "../../lib/api";
import { NewProposalDialog } from "./NewProposalDialog";
import { useActiveProject } from "../../hooks/useActiveProject";
import type { ProposalSummary } from "../../hooks/useProposals";

const STATUS_ACCENT: Record<string, string> = {
  draft: "grey.500",
  "in-progress": "warning.main",
};

interface Props {
  proposals: ProposalSummary[];
  open: boolean;
  onClose: () => void;
}

function progress(p: ProposalSummary): number {
  if (p.taskCount === 0) return 0;
  return Math.round(((p.tasksByStatus?.completed ?? 0) / p.taskCount) * 100);
}

export function ProposalFabModal({ proposals, open, onClose }: Props) {
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const projectId = project?.id;
  const [newOpen, setNewOpen] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);

  async function handleBuild(slug: string) {
    setBuilding(slug);
    try {
      const result = await api.buildProposal(slug, projectId ? { projectId } : undefined);
      onClose();
      navigate(`/terminal?session=${result.sessionId}&label=Building: ${slug}`);
    } catch {
      // fall through
    } finally {
      setBuilding(null);
    }
  }

  function handleView(slug: string) {
    onClose();
    navigate(`/proposals/${slug}`);
  }

  function handleCreated(sessionId: string) {
    onClose();
    navigate(`/terminal?session=${sessionId}&label=New Proposal`);
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        slotProps={{ backdrop: { sx: { backdropFilter: "blur(4px)" } } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DescriptionIcon color="primary" />
          <Typography variant="h6" component="span">
            Active Proposals
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {proposals.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
              No active proposals.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {proposals.map((p) => (
                <Card
                  key={p.slug}
                  variant="outlined"
                  sx={{ borderLeft: 3, borderLeftColor: STATUS_ACCENT[p.status] ?? "grey.500" }}
                >
                  <CardActionArea onClick={() => handleView(p.slug)}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {p.title}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip
                              label={p.status}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.65rem", height: 20, textTransform: "capitalize" }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {p.tasksByStatus?.completed ?? 0}/{p.taskCount} tasks
                            </Typography>
                          </Stack>
                          {p.taskCount > 0 && (
                            <LinearProgress
                              variant="determinate"
                              value={progress(p)}
                              sx={{ height: 4, borderRadius: 2, mt: 0.75 }}
                            />
                          )}
                        </Box>
                        {p.status === "draft" && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RocketLaunchIcon sx={{ fontSize: 14 }} />}
                            disabled={building === p.slug}
                            onClick={(e) => { e.stopPropagation(); handleBuild(p.slug); }}
                            sx={{ ml: 1.5, fontSize: "0.7rem", height: 28, textTransform: "none", flexShrink: 0 }}
                          >
                            Build
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewOpen(true)}
            disableElevation
            sx={{ textTransform: "none" }}
          >
            New Proposal
          </Button>
        </DialogActions>
      </Dialog>

      <NewProposalDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={handleCreated}
        projectId={projectId}
      />
    </>
  );
}
