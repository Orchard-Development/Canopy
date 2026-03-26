import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { api, type ServerInfo, type ServersResponse } from "../../lib/api";

function statusColor(status: ServerInfo["status"]): "success" | "error" | "warning" {
  if (status === "listening") return "success";
  if (status === "down") return "error";
  return "warning";
}

function formatUptime(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainMinutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function ServerRow({
  server,
  restarting,
  onRestart,
}: {
  server: ServerInfo;
  restarting: boolean;
  onRestart: () => void;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
      <FiberManualRecordIcon
        fontSize="small"
        color={statusColor(server.status)}
        sx={{ fontSize: 12 }}
      />
      <Typography variant="body2" sx={{ minWidth: 120 }}>
        {server.name}
      </Typography>
      <Chip label={`:${server.port}`} size="small" variant="outlined" />
      <Chip
        label={server.status}
        size="small"
        color={statusColor(server.status)}
        variant="outlined"
      />
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="Restart">
        <span>
          <IconButton
            size="small"
            onClick={onRestart}
            disabled={restarting}
          >
            {restarting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <RestartAltIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

export function ServersCard() {
  const [data, setData] = useState<ServersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.servers());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleRestart(name: string) {
    setRestarting(name);
    try {
      await api.restartServer(name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setRestarting(null);
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Servers</Typography>
          <Button
            size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Services managed by the {__BRAND_NAME__} engine.
        </Typography>

        {loading && !data && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {data && (
          <>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {(data.servers ?? []).map((s) => (
                <ServerRow
                  key={s.name}
                  server={s}
                  restarting={restarting === s.name}
                  onRestart={() => handleRestart(s.name)}
                />
              ))}
              {(!data.servers || data.servers.length === 0) && (
                <Typography variant="body2" color="text.secondary">
                  No servers reported.
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography variant="caption" color="text.secondary">
                PID: {data.pid}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Uptime: {formatUptime(data.startedAt)}
              </Typography>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
