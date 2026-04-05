import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Stack,
  Chip,
  Button,
  CircularProgress,
  Box,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SpaIcon from "@mui/icons-material/Spa";
import { api } from "../../lib/api";
import { PackCard } from "../seedpacks/PackCard";
import type { PackCardData } from "../seedpacks/PackCard";

interface PackState {
  version: number;
  appliedAt: string;
  files: Record<string, { status: string }>;
}

interface SeedResult {
  applied: number;
  updated: number;
  current: number;
}

interface PackMeta {
  id: string;
  name: string;
  description: string;
  source: string;
  auto_apply: boolean;
  version: number;
  fileCount: number;
  category?: string;
  techStack?: string[];
}

function summarizeFiles(files: Record<string, { status: string }>) {
  const counts = { seeded: 0, updated: 0, current: 0, drifted: 0, "skipped-existing": 0 };
  for (const f of Object.values(files)) {
    const s = f.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }
  return counts;
}

function toPackCard(slug: string, state: PackState | null, meta?: PackMeta): PackCardData {
  return {
    id: meta?.id ?? slug,
    name: meta?.name ?? slug,
    slug,
    description: meta?.description ?? "",
    source: (meta?.source ?? "public") as PackCardData["source"],
    fileCount: state ? Object.keys(state.files ?? {}).length : (meta?.fileCount ?? 0),
    version: state?.version ?? meta?.version ?? 0,
    category: meta?.category,
    auto_apply: meta?.auto_apply ?? false,
  };
}

function AppliedPackRow({ slug, state, meta, projectId, onUnplant, onRefresh }: {
  slug: string;
  state: PackState;
  meta?: PackMeta;
  projectId: string;
  onUnplant: (slug: string) => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const files = state.files ?? {};
  const counts = summarizeFiles(files);
  const total = Object.keys(files).length;
  const healthy = counts.current + counts.seeded + counts.updated;
  const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const isCore = meta?.auto_apply ?? false;

  async function handleSeed() {
    setSeeding(true);
    setResult(null);
    try {
      const { results } = await api.seedProject(projectId, [slug], { force: true });
      if (results?.[slug]) setResult(results[slug]);
      onRefresh();
    } catch { /* ignore */ }
    setSeeding(false);
  }

  return (
    <Box>
      <PackCard
        pack={toPackCard(slug, state, meta)}
        compact
        onClick={meta?.id ? () => navigate(`/seed-packs/${meta.id}`) : undefined}
        onDelete={!isCore ? (e) => { e.preventDefault(); onUnplant(slug); } : undefined}
      />
      <Box sx={{ px: 1.5, pt: 0.5, pb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          color={counts.drifted > 0 ? "warning" : "success"}
          sx={{ height: 3, borderRadius: 1, mb: 0.5 }}
        />
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
          {counts.current > 0 && <Chip label={`${counts.current} current`} size="small" variant="outlined" />}
          {counts.seeded > 0 && <Chip label={`${counts.seeded} seeded`} size="small" color="success" variant="outlined" />}
          {counts.updated > 0 && <Chip label={`${counts.updated} updated`} size="small" color="info" variant="outlined" />}
          {counts["skipped-existing"] > 0 && <Chip label={`${counts["skipped-existing"]} skipped`} size="small" color="warning" variant="outlined" />}
          {counts.drifted > 0 && <Chip label={`${counts.drifted} drifted`} size="small" color="error" variant="outlined" />}
          <Button size="small" onClick={handleSeed} disabled={seeding} sx={{ ml: "auto !important" }}>
            {seeding ? <CircularProgress size={12} sx={{ mr: 0.5 }} /> : null}
            Re-seed
          </Button>
        </Stack>
        {result && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            {result.applied > 0 && <Chip label={`${result.applied} applied`} size="small" color="success" />}
            {result.updated > 0 && <Chip label={`${result.updated} updated`} size="small" color="info" />}
            {result.current > 0 && <Chip label={`${result.current} unchanged`} size="small" />}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function UnappliedPackRow({ slug, meta, projectId, onRefresh }: {
  slug: string;
  meta?: PackMeta;
  projectId: string;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      await api.seedProject(projectId, [slug]);
      onRefresh();
    } catch { /* ignore */ }
    setSeeding(false);
  }

  return (
    <Box>
      <PackCard
        pack={toPackCard(slug, null, meta)}
        compact
        onClick={meta?.id ? () => navigate(`/seed-packs/${meta.id}`) : undefined}
      />
      <Box sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
        <Button size="small" variant="contained" onClick={handleSeed} disabled={seeding}>
          {seeding ? <CircularProgress size={12} sx={{ mr: 0.5 }} /> : null}
          Apply
        </Button>
      </Box>
    </Box>
  );
}

export function SeedStatusCard({ projectId }: { projectId: string }) {
  const [packs, setPacks] = useState<Record<string, PackState | null>>({});
  const [packMeta, setPackMeta] = useState<Record<string, PackMeta>>({});
  const [fetching, setFetching] = useState(true);
  const [unplantTarget, setUnplantTarget] = useState<string | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [unplanting, setUnplanting] = useState(false);
  const [unplantError, setUnplantError] = useState<string | null>(null);

  function load() {
    setFetching(true);
    Promise.all([api.getSeedStatus(projectId), api.listSeedPacks()])
      .then(([status, packList]) => {
        setPacks(status.packs as Record<string, PackState | null>);
        const meta: Record<string, PackMeta> = {};
        for (const p of packList) {
          meta[p.slug] = {
            id: p.id, name: p.name, description: p.description ?? "",
            source: p.source, auto_apply: p.auto_apply ?? false,
            version: p.version ?? 0, fileCount: p.fileCount ?? 0,
            category: p.category, techStack: p.techStack,
          };
        }
        setPackMeta(meta);
      })
      .catch(() => setPacks({}))
      .finally(() => setFetching(false));
  }

  useEffect(() => { load(); }, [projectId]);

  const appliedSlugs = Object.keys(packs).filter((s) => packs[s] != null);
  const unappliedPublicSlugs = Object.keys(packMeta).filter(
    (s) => packMeta[s].source === "public" && (!(s in packs) || packs[s] == null)
  );

  const handleConfirmUnplant = async () => {
    if (!unplantTarget) return;
    setUnplanting(true);
    setUnplantError(null);
    try {
      await api.unplantPack(projectId, unplantTarget, { deleteFiles });
      setUnplantTarget(null);
      load();
    } catch (e: unknown) {
      setUnplantError(e instanceof Error ? e.message : "Unplant failed");
    } finally {
      setUnplanting(false);
    }
  };

  if (fetching) return <CircularProgress size={20} sx={{ my: 1 }} />;

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <SpaIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" fontWeight={700}>Seed Packs</Typography>
      </Stack>

      {appliedSlugs.length > 0 && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary">Applied</Typography>
          {appliedSlugs.map((slug) => (
            <AppliedPackRow
              key={slug}
              slug={slug}
              state={packs[slug]!}
              meta={packMeta[slug]}
              projectId={projectId}
              onUnplant={setUnplantTarget}
              onRefresh={load}
            />
          ))}
        </Stack>
      )}

      {unappliedPublicSlugs.length > 0 && (
        <Stack spacing={1.5} sx={{ mt: appliedSlugs.length > 0 ? 2 : 0 }}>
          <Typography variant="subtitle2" color="text.secondary">Available</Typography>
          {unappliedPublicSlugs.map((slug) => (
            <UnappliedPackRow
              key={slug}
              slug={slug}
              meta={packMeta[slug]}
              projectId={projectId}
              onRefresh={load}
            />
          ))}
        </Stack>
      )}

      {appliedSlugs.length === 0 && unappliedPublicSlugs.length === 0 && (
        <Typography variant="body2" color="text.secondary">No packs available.</Typography>
      )}

      <Dialog open={!!unplantTarget} onClose={() => setUnplantTarget(null)}>
        <DialogTitle>Remove pack?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove <strong>{unplantTarget}</strong> from this project?
          </DialogContentText>
          <FormControlLabel
            control={<Checkbox checked={deleteFiles} onChange={(e) => setDeleteFiles(e.target.checked)} />}
            label="Delete seeded files (keeps drifted files)"
          />
          {unplantError && (
            <Typography color="error" variant="caption" sx={{ display: "block", mt: 1 }}>
              {unplantError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnplantTarget(null)} disabled={unplanting}>Cancel</Button>
          <Button onClick={handleConfirmUnplant} color="error" disabled={unplanting}>
            {unplanting ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
