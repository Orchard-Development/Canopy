import { useState, useEffect, useCallback } from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";
import { WorkerRow } from "./WorkerRow";
import { getWorkerState, STATE_COLORS } from "./worker-metrics";
import type { WorkerStatus, WorkerState } from "./worker-metrics";

export function AutomationCard() {
  const [workers, setWorkers] = useState<Record<string, WorkerStatus> | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const { channel } = useDashboardChannel();

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      if (res.ok) setWorkers(await res.json());
    } catch { /* engine unreachable */ }
  }, []);

  // Poll as fallback reconciliation
  useEffect(() => {
    fetchWorkers();
    const id = setInterval(fetchWorkers, 30_000);
    return () => clearInterval(id);
  }, [fetchWorkers]);

  // Real-time updates via DashboardChannel
  useEffect(() => {
    if (!channel) return;
    const ref = channel.on("worker:event", () => { fetchWorkers(); });
    return () => { channel.off("worker:event", ref); };
  }, [channel, fetchWorkers]);

  const toggle = async (name: string, currentlyEnabled: boolean) => {
    setToggling((s) => new Set(s).add(name));
    const action = currentlyEnabled ? "disable" : "enable";
    await fetch(`/api/workers/${name}/${action}`, { method: "POST" });
    await fetchWorkers();
    setToggling((s) => { const next = new Set(s); next.delete(name); return next; });
  };

  const trigger = async (name: string) => {
    await fetch(`/api/workers/${name}/trigger`, { method: "POST" });
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
  const counts = sorted.reduce<Record<WorkerState, number>>(
    (acc, w) => { acc[getWorkerState(w)]++; return acc; },
    { idle: 0, active: 0, error: 0, disabled: 0 },
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Background Workers</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {(Object.entries(counts) as [WorkerState, number][])
            .filter(([, n]) => n > 0)
            .map(([state, n]) => (
              <Chip
                key={state}
                label={`${n} ${state}`}
                size="small"
                sx={{
                  fontSize: "0.7rem",
                  bgcolor: STATE_COLORS[state],
                  color: "#fff",
                  fontWeight: 600,
                }}
              />
            ))}
        </Stack>
        <Stack spacing={0.75}>
          {sorted.map((w) => (
            <WorkerRow
              key={w.name}
              worker={w}
              toggling={toggling.has(w.name)}
              onToggle={toggle}
              onTrigger={trigger}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
