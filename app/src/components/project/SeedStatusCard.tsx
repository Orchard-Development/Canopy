import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  CircularProgress,
  Box,
  LinearProgress,
} from "@mui/material";
import SpaIcon from "@mui/icons-material/Spa";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { api } from "../../lib/api";

interface PackState {
  version: number;
  appliedAt: string;
  files: Record<string, { status: string }>;
}

interface SeedResult {
  applied: number;
  updated: number;
  current: number;
  skipped: number;
  drifted: number;
}

interface Props {
  projectId: string;
}

function summarizeFiles(files: Record<string, { status: string }>) {
  const counts = { seeded: 0, updated: 0, current: 0, drifted: 0, "skipped-existing": 0 };
  for (const f of Object.values(files)) {
    const s = f.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }
  return counts;
}

function AppliedPackRow({ name, state, projectId, onRefresh }: {
  name: string;
  state: PackState;
  projectId: string;
  onRefresh: () => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const files = state.files ?? {};
  const counts = summarizeFiles(files);
  const total = Object.keys(files).length;
  const healthy = counts.current + counts.seeded + counts.updated;
  const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const hasDrift = counts.drifted > 0;
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  async function handleSeed() {
    setSeeding(true);
    setResult(null);
    try {
      const { results } = await api.seedProject(projectId);
      if (results[name]) setResult(results[name]);
      onRefresh();
    } catch { /* ignore */ }
    setSeeding(false);
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        {hasDrift
          ? <WarningAmberIcon sx={{ fontSize: 16, color: "warning.main" }} />
          : <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "success.main" }} />
        }
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Chip label={`v${state.version}`} size="small" variant="outlined" />
        <Typography variant="caption" color="text.secondary">{total} files</Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={handleSeed}
          disabled={seeding}
          startIcon={seeding ? <CircularProgress size={12} /> : <SpaIcon sx={{ fontSize: 14 }} />}
          sx={{ ml: "auto !important", minWidth: 0, px: 1.5 }}
        >
          {seeding ? "..." : "Re-seed"}
        </Button>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={hasDrift ? "warning" : "success"}
        sx={{ height: 4, borderRadius: 2, mb: 0.75 }}
      />
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {counts.current > 0 && <Chip label={`${counts.current} current`} size="small" variant="outlined" />}
        {counts.seeded > 0 && <Chip label={`${counts.seeded} seeded`} size="small" color="success" variant="outlined" />}
        {counts.updated > 0 && <Chip label={`${counts.updated} updated`} size="small" color="info" variant="outlined" />}
        {counts["skipped-existing"] > 0 && <Chip label={`${counts["skipped-existing"]} skipped`} size="small" color="warning" variant="outlined" />}
        {counts.drifted > 0 && <Chip label={`${counts.drifted} drifted`} size="small" color="error" variant="outlined" />}
      </Stack>
      {result && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
          {result.applied > 0 && <Chip label={`${result.applied} applied`} size="small" color="success" />}
          {result.updated > 0 && <Chip label={`${result.updated} updated`} size="small" color="info" />}
          {result.current > 0 && <Chip label={`${result.current} unchanged`} size="small" />}
        </Stack>
      )}
    </Box>
  );
}

function UnappliedPackRow({ name, projectId, onRefresh }: {
  name: string;
  projectId: string;
  onRefresh: () => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  async function handleSeed() {
    setSeeding(true);
    try {
      await api.seedProject(projectId);
      onRefresh();
    } catch { /* ignore */ }
    setSeeding(false);
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        <Typography variant="body2" fontWeight={600} color="text.secondary">{label}</Typography>
        <Chip label="not applied" size="small" variant="outlined" color="default" />
        <Button
          size="small"
          variant="contained"
          onClick={handleSeed}
          disabled={seeding}
          startIcon={seeding ? <CircularProgress size={12} /> : <SpaIcon sx={{ fontSize: 14 }} />}
          sx={{ ml: "auto !important", minWidth: 0, px: 1.5 }}
        >
          {seeding ? "..." : "Seed"}
        </Button>
      </Stack>
    </Box>
  );
}

export function SeedStatusCard({ projectId }: Props) {
  const [packs, setPacks] = useState<Record<string, PackState | null>>({});
  const [shippedSlugs, setShippedSlugs] = useState<string[]>([]);
  const [fetching, setFetching] = useState(true);

  function load() {
    setFetching(true);
    Promise.all([
      api.getSeedStatus(projectId),
      api.listSeedPacks(),
    ])
      .then(([status, packList]) => {
        setPacks(status.packs as Record<string, PackState | null>);
        setShippedSlugs(
          packList
            .filter((p: { source: string }) => p.source === "shipped")
            .map((p: { slug: string }) => p.slug)
        );
      })
      .catch(() => setPacks({}))
      .finally(() => setFetching(false));
  }

  useEffect(() => { load(); }, [projectId]);

  // All unique pack names: shipped packs always shown + any user packs from status
  const allNames = Array.from(new Set([...shippedSlugs, ...Object.keys(packs)]));

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <SpaIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>Seed Packs</Typography>
        </Stack>

        {fetching && <CircularProgress size={20} sx={{ my: 1 }} />}

        {!fetching && (
          <Stack spacing={1.5}>
            {allNames.map((name) => {
              const state = packs[name];
              return state
                ? <AppliedPackRow key={name} name={name} state={state} projectId={projectId} onRefresh={load} />
                : <UnappliedPackRow key={name} name={name} projectId={projectId} onRefresh={load} />;
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
