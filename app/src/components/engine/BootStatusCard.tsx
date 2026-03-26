import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { HealthData } from "./engine-types";

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

export function BootStatusCard({ health }: { health: HealthData | null }) {
  if (!health) {
    return (
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600}>Boot Status</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const proc = health.process;
  const isElixir = health.engine === "elixir-otp";

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>Boot Status</Typography>
          <Chip
            label={health.status}
            size="small"
            color={health.status === "ok" ? "success" : "warning"}
            variant="outlined"
          />
          {health.version && (
            <Chip
              label={`v${health.version}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.65rem" }}
            />
          )}
          {health.engine && (
            <Chip
              label={health.engine}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.65rem" }}
            />
          )}
          {health.packaged && (
            <Chip label="packaged" size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
          )}
        </Box>
        {isElixir && (
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={2}>
              {health.uptime != null && (
                <Typography variant="caption" color="text.secondary">
                  Uptime: <strong>{formatUptime(Math.abs(health.uptime))}</strong>
                </Typography>
              )}
              {health.platform && (
                <Typography variant="caption" color="text.secondary">
                  {health.platform}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={2}>
              {health.aiConfigured != null && (
                <Typography variant="caption" color="text.secondary">
                  AI: <strong>{health.aiConfigured ? "configured" : "not configured"}</strong>
                </Typography>
              )}
              {health.firstRun != null && health.firstRun && (
                <Typography variant="caption" color="text.secondary">
                  First run
                </Typography>
              )}
            </Stack>
          </Stack>
        )}
        {proc && !isElixir && (
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={2}>
              <Typography variant="caption" color="text.secondary">
                PID: <strong>{proc.pid}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Uptime: <strong>{formatUptime(proc.uptimeSec)}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Node {proc.nodeVersion}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Started: {new Date(proc.startedAt).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              CWD: <code>{proc.cwd}</code>
            </Typography>
            {proc.tty && (
              <Typography variant="caption" color="text.secondary">
                TTY: {proc.tty}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
