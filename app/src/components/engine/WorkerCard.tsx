import { useState, useEffect, useCallback } from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { getWorkerState, STATE_COLORS } from "../settings/worker-metrics";
import type { WorkerStatus, WorkerState } from "../settings/worker-metrics";

export function WorkerCard() {
  const [workers, setWorkers] = useState<Record<string, WorkerStatus> | null>(null);

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

  const list = Object.values(workers);
  const counts = list.reduce<Record<WorkerState, number>>(
    (acc, w) => { acc[getWorkerState(w)]++; return acc; },
    { idle: 0, active: 0, error: 0, disabled: 0 },
  );

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="body2" fontWeight={600}>
            Workers ({list.length})
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {(Object.entries(counts) as [WorkerState, number][])
              .filter(([, n]) => n > 0)
              .map(([state, n]) => (
                <Chip
                  key={state}
                  label={`${n} ${state}`}
                  size="small"
                  sx={{
                    fontSize: "0.6rem",
                    height: 18,
                    bgcolor: STATE_COLORS[state],
                    color: "#fff",
                    fontWeight: 600,
                  }}
                />
              ))}
          </Stack>
        </Box>
        <Typography
          variant="caption"
          color="primary"
          component="a"
          href="/settings?tab=automation"
          sx={{ mt: 0.5, display: "inline-block", cursor: "pointer" }}
        >
          Manage workers
        </Typography>
      </CardContent>
    </Card>
  );
}
