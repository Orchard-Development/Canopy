import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Switch,
  Typography,
} from "@mui/material";

interface WorkerStatus {
  name: string;
  description: string;
  enabled: boolean;
  cadence: string | [string, number];
  last_run: string | null;
  tick_count: number;
}

const FRIENDLY_NAMES: Record<string, string> = {
  proposer: "Proposal Drafting",
  reviewer: "Proposal Review",
  extractor: "Knowledge Extraction",
  fixer: "Auto-Fix",
  graph_builder: "Dependency Graph",
  cluster_analyzer: "Cluster Analysis",
  memory_gc: "Memory Cleanup",
  auto_research: "Auto Research",
  sync: "File Sync",
};

function formatCadence(cadence: string | [string, number]): string {
  if (cadence === "event") return "event-driven";
  if (Array.isArray(cadence) && cadence[0] === "timer") {
    const ms = cadence[1];
    if (ms >= 60_000) return `every ${Math.round(ms / 60_000)}m`;
    return `every ${Math.round(ms / 1_000)}s`;
  }
  return String(cadence);
}

export function AutomationCard() {
  const [workers, setWorkers] = useState<Record<string, WorkerStatus> | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      if (res.ok) setWorkers(await res.json());
    } catch { /* engine unreachable */ }
  }, []);

  useEffect(() => {
    fetchWorkers();
    const id = setInterval(fetchWorkers, 30_000);
    return () => clearInterval(id);
  }, [fetchWorkers]);

  const toggle = async (name: string, currentlyEnabled: boolean) => {
    setToggling((s) => new Set(s).add(name));
    const action = currentlyEnabled ? "disable" : "enable";
    await fetch(`/api/workers/${name}/${action}`, { method: "POST" });
    await fetchWorkers();
    setToggling((s) => {
      const next = new Set(s);
      next.delete(name);
      return next;
    });
  };

  if (!workers) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Background Workers</Typography>
          <Typography variant="body2" color="text.secondary">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const sorted = Object.values(workers).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Background Workers</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Workers run automatically in the background. Disable any you don't need.
        </Typography>
        <Stack spacing={1}>
          {sorted.map((w) => (
            <Box
              key={w.name}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
                py: 1,
                px: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                opacity: w.enabled ? 1 : 0.6,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>
                    {FRIENDLY_NAMES[w.name] ?? w.name}
                  </Typography>
                  <Chip
                    label={formatCadence(w.cadence)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.65rem", height: 20 }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
                  {w.description}
                </Typography>
              </Box>
              <Switch
                size="small"
                checked={w.enabled}
                disabled={toggling.has(w.name)}
                onChange={() => toggle(w.name, w.enabled)}
                sx={{ mt: 0.25, flexShrink: 0 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
