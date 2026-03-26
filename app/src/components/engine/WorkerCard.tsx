import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

interface WorkerStatus {
  name: string;
  description: string;
  enabled: boolean;
  cadence: string | [string, number];
  last_run: string | null;
  tick_count: number;
  [key: string]: unknown;
}

const WORKER_COLORS: Record<string, string> = {
  proposer: "#7c4dff",
  reviewer: "#00bfa5",
  extractor: "#ff6d00",
  cluster_analyzer: "#448aff",
  fixer: "#e53935",
  graph_builder: "#43a047",
  memory_gc: "#8d6e63",
  auto_research: "#fdd835",
};

function formatCadence(cadence: string | [string, number]): string {
  if (cadence === "event") return "event-driven";
  if (Array.isArray(cadence) && cadence[0] === "timer") {
    const ms = cadence[1];
    if (ms >= 60_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 1_000)}s`;
  }
  return String(cadence);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export function WorkerCard() {
  const [workers, setWorkers] = useState<Record<string, WorkerStatus> | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      if (res.ok) setWorkers(await res.json());
    } catch {
      /* engine unreachable */
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
    const id = setInterval(fetchWorkers, 30_000);
    return () => clearInterval(id);
  }, [fetchWorkers]);

  const toggle = async (name: string, enabled: boolean) => {
    setToggling((s) => new Set(s).add(name));
    const action = enabled ? "disable" : "enable";
    await fetch(`/api/workers/${name}/${action}`, { method: "POST" });
    await fetchWorkers();
    setToggling((s) => {
      const next = new Set(s);
      next.delete(name);
      return next;
    });
  };

  const trigger = async (name: string) => {
    await fetch(`/api/workers/${name}/trigger`, { method: "POST" });
  };

  if (!workers) {
    return (
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600}>Workers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const sorted = Object.values(workers).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          Workers
        </Typography>
        <Stack spacing={0.75}>
          {sorted.map((w) => (
            <Box
              key={w.name}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                opacity: w.enabled ? 1 : 0.55,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: WORKER_COLORS[w.name] ?? "#9e9e9e",
                  flexShrink: 0,
                }}
              />
              <Tooltip title={w.description} placement="top" arrow>
                <Typography
                  variant="caption"
                  sx={{ minWidth: 110, fontWeight: 500, cursor: "default" }}
                >
                  {w.name}
                </Typography>
              </Tooltip>
              <Chip
                label={formatCadence(w.cadence)}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 55 }}>
                {timeAgo(w.last_run)}
              </Typography>
              <Box sx={{ flex: 1 }} />
              {w.enabled && (
                <Tooltip title="Trigger now">
                  <IconButton size="small" onClick={() => trigger(w.name)} sx={{ p: 0.25 }}>
                    <PlayArrowIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Switch
                size="small"
                checked={w.enabled}
                disabled={toggling.has(w.name)}
                onChange={() => toggle(w.name, w.enabled)}
                sx={{ ml: -0.5 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
