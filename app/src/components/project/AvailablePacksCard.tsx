import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GrassIcon from "@mui/icons-material/Grass";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { api } from "../../lib/api";

interface SeedPack {
  id: string;
  name: string;
  slug: string;
  description: string;
  fileCount: number;
  version: number;
  source: string;
  updated_at: string;
}

interface PlantResult {
  applied: number;
  updated: number;
  current: number;
  skipped: number;
  drifted: number;
}

interface PackState {
  version: number;
  files: Record<string, { status: string }>;
}

interface Props {
  projectId: string;
  refreshKey: number;
}

export function AvailablePacksCard({ projectId, refreshKey }: Props) {
  const [packs, setPacks] = useState<SeedPack[]>([]);
  const [plantedSlugs, setPlantedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [planting, setPlanting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, PlantResult>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.listSeedPacks(),
      api.getSeedStatus(projectId),
    ])
      .then(([packList, status]) => {
        setPacks(packList.filter((p: SeedPack) => p.source !== "shipped"));
        const planted = new Set<string>();
        for (const [slug, state] of Object.entries(status.packs)) {
          if (state) planted.add(slug);
        }
        setPlantedSlugs(planted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey, projectId]);

  async function handlePlant(packId: string, slug: string) {
    setPlanting(packId);
    try {
      const res = await api.plantSeedPack(projectId, packId);
      setResults((prev) => ({ ...prev, [packId]: res.result }));
      setPlantedSlugs((prev) => new Set([...prev, slug]));
    } catch { /* ignore */ }
    setPlanting(null);
  }

  async function handleDelete(packId: string) {
    try {
      await api.deleteSeedPack(packId);
      setPacks((prev) => prev.filter((p) => p.id !== packId));
    } catch { /* ignore */ }
  }

  if (loading) return <CircularProgress size={20} />;
  if (packs.length === 0) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <GrassIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>Custom Packs</Typography>
        </Stack>

        <Stack spacing={1.5}>
          {packs.map((pack) => {
            const isPlanted = plantedSlugs.has(pack.slug);
            return (
              <Stack key={pack.id} spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {isPlanted
                    ? <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "success.main" }} />
                    : <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                  }
                  <Typography variant="body2" fontWeight={600}>{pack.name}</Typography>
                  <Chip label={`v${pack.version}`} size="small" variant="outlined" />
                  <Chip label={`${pack.fileCount} files`} size="small" variant="outlined" />
                  {!isPlanted && (
                    <Chip label="not planted" size="small" variant="outlined" color="default" />
                  )}
                  <Stack direction="row" spacing={0} sx={{ ml: "auto !important" }}>
                    <Button
                      size="small"
                      variant={isPlanted ? "outlined" : "contained"}
                      onClick={() => handlePlant(pack.id, pack.slug)}
                      disabled={planting === pack.id}
                      startIcon={planting === pack.id ? <CircularProgress size={12} /> : undefined}
                    >
                      {planting === pack.id ? "..." : isPlanted ? "Re-plant" : "Plant"}
                    </Button>
                    <Tooltip title="Delete pack">
                      <IconButton size="small" onClick={() => handleDelete(pack.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                {pack.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 3.5 }}>
                    {pack.description}
                  </Typography>
                )}
                {results[pack.id] && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ ml: 3.5 }}>
                    {results[pack.id].applied > 0 && <Chip label={`${results[pack.id].applied} applied`} size="small" color="success" variant="outlined" />}
                    {results[pack.id].updated > 0 && <Chip label={`${results[pack.id].updated} updated`} size="small" color="info" variant="outlined" />}
                    {results[pack.id].current > 0 && <Chip label={`${results[pack.id].current} current`} size="small" variant="outlined" />}
                    {results[pack.id].skipped > 0 && <Chip label={`${results[pack.id].skipped} skipped`} size="small" color="warning" variant="outlined" />}
                    {results[pack.id].drifted > 0 && <Chip label={`${results[pack.id].drifted} drifted`} size="small" color="error" variant="outlined" />}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
