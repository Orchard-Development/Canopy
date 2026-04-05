import { useState, useEffect, useCallback } from "react";
import {
  Stack, Typography, Button, Card, CardContent,
  Chip, LinearProgress, Box, CircularProgress,
  Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Checkbox, FormControlLabel,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { api } from "../../lib/api";
import { AvailablePacksCard } from "./AvailablePacksCard";
import { HarvestDialog } from "./HarvestDialog";
import { AiHarvestDialog } from "./AiHarvestDialog";

interface PackState {
  version?: number;
  appliedAt?: string;
  files?: Record<string, { status: string; appliedSha256?: string }>;
}

interface Props {
  projectId: string;
  projectName?: string;
}

function summarizeFiles(files: Record<string, { status: string }>) {
  const counts: Record<string, number> = { current: 0, seeded: 0, updated: 0, drifted: 0 };
  for (const f of Object.values(files)) {
    const s = f.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }
  return counts;
}

function PackCard({
  slug,
  state,
  isCore,
  onUnplant,
  onReseed,
}: {
  slug: string;
  state: PackState;
  isCore: boolean;
  onUnplant: (slug: string) => void;
  onReseed: () => void;
}) {
  const files = state.files ?? {};
  const counts = summarizeFiles(files);
  const total = Object.keys(files).length;
  const healthy = counts.current + counts.seeded + counts.updated;
  const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;

  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
            {slug}
          </Typography>
          {state.version !== undefined && (
            <Chip label={`v${state.version}`} size="small" />
          )}
          <Typography variant="caption" color="text.secondary">
            {total} files
          </Typography>
          {isCore ? (
            <Tooltip title="Core pack -- cannot unplant without force">
              <LockIcon fontSize="small" color="disabled" />
            </Tooltip>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => onUnplant(slug)}
            >
              Unplant
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={onReseed}>
            Re-seed
          </Button>
        </Stack>
        {total > 0 && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={pct === 100 ? "success" : counts.drifted > 0 ? "warning" : "primary"}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function PacksTab({ projectId, projectName }: Props) {
  const [packs, setPacks] = useState<Record<string, PackState>>({});
  const [autoApplySlugs, setAutoApplySlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [aiHarvestOpen, setAiHarvestOpen] = useState(false);
  const [unplantTarget, setUnplantTarget] = useState<string | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [unplanting, setUnplanting] = useState(false);
  const [unplantError, setUnplantError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    api.getSeedStatus(projectId)
      .then((data) => setPacks((data.packs as Record<string, PackState>) ?? {}))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshKey((k) => k + 1);
      });
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    api.listSeedPacks().then((list) => {
      const slugs = new Set(
        list.filter((p: { auto_apply?: boolean }) => p.auto_apply).map((p: { slug: string }) => p.slug)
      );
      setAutoApplySlugs(slugs);
    }).catch(() => {});
  }, []);

  const corePacks = Object.entries(packs).filter(([slug]) => autoApplySlugs.has(slug));
  const optionalPacks = Object.entries(packs).filter(([slug]) => !autoApplySlugs.has(slug));

  const handleConfirmUnplant = async () => {
    if (!unplantTarget) return;
    setUnplanting(true);
    setUnplantError(null);
    try {
      await api.unplantPack(projectId, unplantTarget, { deleteFiles });
      setUnplantTarget(null);
      refresh();
    } catch (e: unknown) {
      setUnplantError(e instanceof Error ? e.message : "Unplant failed");
    } finally {
      setUnplanting(false);
    }
  };

  const handleReseed = () => {
    api.seedProject(projectId).then(refresh).catch(() => {});
  };

  if (loading) return <Box sx={{ p: 2 }}><CircularProgress size={24} /></Box>;

  return (
    <Stack spacing={2.5}>
      {corePacks.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">Core Packs</Typography>
          {corePacks.map(([slug, state]) => (
            <PackCard
              key={slug}
              slug={slug}
              state={state}
              isCore
              onUnplant={() => {}}
              onReseed={handleReseed}
            />
          ))}
        </Stack>
      )}

      {optionalPacks.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">Applied Packs</Typography>
          {optionalPacks.map(([slug, state]) => (
            <PackCard
              key={slug}
              slug={slug}
              state={state}
              isCore={false}
              onUnplant={setUnplantTarget}
              onReseed={handleReseed}
            />
          ))}
        </Stack>
      )}

      {corePacks.length === 0 && optionalPacks.length === 0 && (
        <Typography variant="body2" color="text.secondary">No packs applied to this project.</Typography>
      )}

      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">Available Packs</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<AgricultureIcon />} onClick={() => setHarvestOpen(true)}>
            Harvest from project
          </Button>
          <Button variant="outlined" size="small" startIcon={<AutoAwesomeIcon />} onClick={() => setAiHarvestOpen(true)}>
            AI Harvest
          </Button>
        </Stack>
        <AvailablePacksCard projectId={projectId} refreshKey={refreshKey} />
      </Stack>

      <Dialog open={!!unplantTarget} onClose={() => setUnplantTarget(null)}>
        <DialogTitle>Remove pack from project?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove <strong>{unplantTarget}</strong> from this project?
          </DialogContentText>
          <FormControlLabel
            control={<Checkbox checked={deleteFiles} onChange={(e) => setDeleteFiles(e.target.checked)} />}
            label="Delete seeded files (keeps drifted files)"
          />
          {unplantError && (
            <Typography color="error" variant="caption">{unplantError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnplantTarget(null)} disabled={unplanting}>Cancel</Button>
          <Button onClick={handleConfirmUnplant} color="error" disabled={unplanting}>
            {unplanting ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      <HarvestDialog
        projectId={projectId}
        open={harvestOpen}
        onClose={() => setHarvestOpen(false)}
        onHarvested={refresh}
      />
      <AiHarvestDialog
        projectId={projectId}
        projectName={projectName ?? "this project"}
        open={aiHarvestOpen}
        onClose={() => setAiHarvestOpen(false)}
        onHarvested={refresh}
      />
    </Stack>
  );
}
