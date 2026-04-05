import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Skeleton,
  Alert,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import TagIcon from "@mui/icons-material/Tag";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { api } from "../lib/api";
import { CardGrid } from "../components/CardGrid";
import { NewProposalDialog } from "../components/proposal/NewProposalDialog";
import { useActiveProject } from "../hooks/useActiveProject";
import { useChannelEvent } from "../hooks/useChannelEvent";
import { useDashboardChannel } from "../hooks/useDashboardChannel";
import { EVENTS } from "../lib/events";

interface ProposalSummary {
  slug: string;
  title: string;
  date: string;
  status: string;
  repo: string;
  ticket: string | null;
  taskCount: number;
  tasksByStatus: Record<string, number>;
}

const STATUS_CHIP_COLOR: Record<string, "default" | "warning" | "success" | "error"> = {
  draft: "default",
  "in-progress": "warning",
  completed: "success",
  rejected: "error",
};

const STATUS_TOP_BORDER: Record<string, string> = {
  draft: "divider",
  "in-progress": "warning.main",
  completed: "success.main",
  rejected: "error.main",
};

const TASK_DOT_COLOR: Record<string, string> = {
  completed: "success.main",
  "in-progress": "warning.main",
  pending: "text.disabled",
  blocked: "error.main",
  skipped: "text.disabled",
};

const TASK_STATUS_ORDER = ["completed", "in-progress", "pending", "blocked", "skipped"];

function taskProgress(tasksByStatus: Record<string, number>, total: number) {
  if (total === 0) return 0;
  return Math.round(((tasksByStatus?.completed ?? 0) / total) * 100);
}

function formatDate(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ProposalCard({ proposal, onBuild, onDelete }: { proposal: ProposalSummary; onBuild: (slug: string) => void; onDelete: (slug: string) => void }) {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const progress = taskProgress(proposal.tasksByStatus, proposal.taskCount);
  const chipColor = STATUS_CHIP_COLOR[proposal.status] ?? "default";
  const topBorderColor = STATUS_TOP_BORDER[proposal.status] ?? "divider";
  const formattedDate = formatDate(proposal.date);

  const taskEntries = [
    ...TASK_STATUS_ORDER.filter((s) => (proposal.tasksByStatus?.[s] ?? 0) > 0),
    ...Object.keys(proposal.tasksByStatus ?? {}).filter(
      (s) => !TASK_STATUS_ORDER.includes(s) && (proposal.tasksByStatus[s] ?? 0) > 0,
    ),
  ].map((s) => ({ status: s, count: proposal.tasksByStatus[s] }));

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: "pointer",
        height: "100%",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.1)", borderColor: "primary.main" },
        borderTop: "3px solid",
        borderTopColor: topBorderColor,
      }}
      onClick={() => navigate(`/proposals/${proposal.slug}`)}
    >
      <CardContent sx={{ pb: "12px !important" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Chip
            label={proposal.status.replace("-", " ")}
            size="small"
            color={chipColor}
            variant="outlined"
            sx={{ fontSize: "0.68rem", height: 20, textTransform: "capitalize" }}
          />
          <Stack direction="row" alignItems="center" spacing={0.4} sx={{ flexShrink: 0, ml: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 12, color: "text.disabled" }} />
            {formattedDate && (
              <Typography variant="caption" color="text.disabled">{formattedDate}</Typography>
            )}
          </Stack>
        </Stack>

        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1 }}>
          {proposal.title}
        </Typography>

        <Stack direction="row" sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.75 }}>
          {proposal.repo && (
            <Stack direction="row" alignItems="center" spacing={0.4}>
              <FolderOpenIcon sx={{ fontSize: 12, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">{proposal.repo}</Typography>
            </Stack>
          )}
          {proposal.ticket && (
            <Stack direction="row" alignItems="center" spacing={0.4}>
              <TagIcon sx={{ fontSize: 12, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">{proposal.ticket}</Typography>
            </Stack>
          )}
        </Stack>

        {proposal.taskCount > 0 && (
          <Box sx={{ mb: 1.5 }}>
            {taskEntries.length > 0 && (
              <Stack direction="row" sx={{ mb: 0.75, flexWrap: "wrap", gap: 1 }}>
                {taskEntries.map(({ status, count }) => (
                  <Stack key={status} direction="row" alignItems="center" spacing={0.4}>
                    <FiberManualRecordIcon sx={{ fontSize: 8, color: TASK_DOT_COLOR[status] ?? "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary">
                      {count} {status.replace("-", "\u2011")}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
            <LinearProgress variant="determinate" value={progress} sx={{ height: 3, borderRadius: 2 }} />
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: "monospace", fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}
          >
            {proposal.slug}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
            sx={{ p: 0.25 }}
          >
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </CardContent>

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem dense onClick={() => { setMenuAnchor(null); navigate(`/proposals/${proposal.slug}`); }}>
          <OpenInNewIcon sx={{ fontSize: 15, mr: 1, color: "text.secondary" }} />
          Open
        </MenuItem>
        {proposal.status !== "completed" && (
          <MenuItem dense onClick={() => { setMenuAnchor(null); onBuild(proposal.slug); }}>
            <RocketLaunchIcon sx={{ fontSize: 15, mr: 1, color: "text.secondary" }} />
            Build
          </MenuItem>
        )}
        <Divider />
        <MenuItem dense sx={{ color: "error.main" }} onClick={() => { setMenuAnchor(null); onDelete(proposal.slug); }}>
          <DeleteIcon sx={{ fontSize: 15, mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}

function EmptyState() {
  return (
    <Box sx={{ textAlign: "center", py: 8, maxWidth: 480, mx: "auto" }}>
      <DescriptionIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
      <Typography variant="h5" fontWeight={700} gutterBottom>
        No proposals yet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Proposals are created by AI agents before implementation begins.
        Ask an agent to "write a proposal" for your next feature.
      </Typography>
    </Box>
  );
}

export default function Proposals() {
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const projectId = project?.id;
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { channel } = useDashboardChannel();
  const changedEvent = useChannelEvent(channel, EVENTS.proposals.changed);
  const createdEvent = useChannelEvent(channel, EVENTS.proposals.created);

  const load = useCallback(() => {
    setLoading(true);
    api.listProposals(showAll ? undefined : (projectId ?? undefined))
      .then(setProposals)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [projectId, showAll]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (changedEvent) load(); }, [changedEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (createdEvent) load(); }, [createdEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuild = useCallback(async (slug: string) => {
    try {
      await api.buildProposal(slug, { projectId: projectId ?? undefined });
      navigate(`/proposals/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [navigate, projectId]);

  const handleDelete = useCallback(async () => {
    if (!deleteSlug) return;
    try {
      await api.deleteProposal(deleteSlug, projectId ?? undefined);
      setDeleteSlug(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleteSlug(null);
    }
  }, [deleteSlug, load, projectId]);

  const handleCreated = useCallback((sessionId: string) => {
    navigate(`/terminal?session=${sessionId}&label=New Proposal`);
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ pt: 3 }}>
        <CardGrid>
          {[0, 1, 2, 3].map((i) => <Box key={i}><Skeleton variant="rounded" height={160} /></Box>)}
        </CardGrid>
      </Box>
    );
  }

  if (error) return <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>;

  const lowerSearch = search.toLowerCase();
  const filtered = lowerSearch
    ? proposals.filter(
        (p) =>
          p.title?.toLowerCase().includes(lowerSearch) ||
          p.slug?.toLowerCase().includes(lowerSearch) ||
          p.repo?.toLowerCase().includes(lowerSearch) ||
          p.status?.toLowerCase().includes(lowerSearch),
      )
    : proposals;

  const sorted = [...filtered].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return (
    <Box sx={{ pt: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 280 }}
          />
          {projectId && (
            <FormControlLabel
              control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
              label={<Typography variant="body2">All projects</Typography>}
              sx={{ ml: 0.5, mr: 0 }}
            />
          )}
        </Stack>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disableElevation
          sx={{ textTransform: "none" }}
        >
          New Proposal
        </Button>
      </Stack>

      {proposals.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {sorted.length}{filtered.length !== proposals.length ? ` of ${proposals.length}` : ""} proposal{proposals.length !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
          </Typography>
          <CardGrid>
            {sorted.map((p) => (
              <Box key={p.slug}>
                <ProposalCard proposal={p} onBuild={handleBuild} onDelete={setDeleteSlug} />
              </Box>
            ))}
          </CardGrid>
        </>
      )}

      <NewProposalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
        projectId={projectId}
      />

      <Dialog open={!!deleteSlug} onClose={() => setDeleteSlug(null)}>
        <DialogTitle>Delete proposal?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete <strong>{deleteSlug}</strong> and all its task files from disk.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSlug(null)}>Cancel</Button>
          <Button color="error" variant="contained" disableElevation onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
