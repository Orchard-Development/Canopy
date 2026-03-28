import { useState, useEffect, useCallback } from "react";
import { Alert, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { ServersResponse } from "@/lib/api";
import type { HealthData, InstalledMcp } from "../components/engine/engine-types";
import { BootStatusCard } from "../components/engine/BootStatusCard";
import { EngineServicesCard } from "../components/engine/EngineServicesCard";
import { DatabaseCard } from "../components/engine/DatabaseCard";
import { McpSyncCard } from "../components/engine/McpSyncCard";
import { EngineLogsCard } from "../components/engine/EngineLogsCard";
import { WorkerCard } from "../components/engine/WorkerCard";
import { ClaudeReadinessCard } from "../components/settings/ClaudeReadinessCard";
import { ActivityCard } from "../components/engine/ActivityCard";
import { AutoCommitCard } from "../components/engine/AutoCommitCard";
import { DimensionProfilerCard } from "../components/engine/DimensionProfilerCard";

export default function Engine() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [servers, setServers] = useState<ServersResponse | null>(null);
  const [mcpServers, setMcpServers] = useState<InstalledMcp[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      fetch("/api/health").then((r) => r.json()),
      fetch("/api/servers").then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      }),
      fetch("/api/mcp/installed").then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      }),
    ]);

    if (results[0].status === "fulfilled") {
      setHealth(results[0].value as HealthData);
      setError(null);
    } else {
      setError("Engine unreachable");
    }

    if (results[1].status === "fulfilled") {
      setServers(results[1].value as ServersResponse);
    }

    if (results[2].status === "fulfilled") {
      const data = results[2].value;
      setMcpServers(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <Box sx={{ pt: 1, maxWidth: 720, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>Engine Diagnostics</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Refresh all">
          <IconButton size="small" onClick={fetchAll} color="primary">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <ClaudeReadinessCard />
        <BootStatusCard health={health} />
        <EngineServicesCard health={health} servers={servers} />
        <DatabaseCard health={health} />
        <McpSyncCard servers={mcpServers} />
        <AutoCommitCard />
        <DimensionProfilerCard />
        <WorkerCard />
        <EngineLogsCard />
        <ActivityCard />
      </Stack>
    </Box>
  );
}
