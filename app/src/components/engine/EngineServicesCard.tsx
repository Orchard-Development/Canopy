import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { ServerInfo, ServersResponse } from "@/lib/api";
import type { HealthData } from "./engine-types";

function ServiceIcon({ status }: { status: "ok" | "degraded" | "down" }) {
  if (status === "ok") return <CheckCircleOutlineIcon sx={{ fontSize: 16 }} color="success" />;
  if (status === "degraded") return <WarningAmberIcon sx={{ fontSize: 16 }} color="warning" />;
  return <ErrorOutlineIcon sx={{ fontSize: 16 }} color="error" />;
}

export function EngineServicesCard({
  health,
  servers,
}: {
  health: HealthData | null;
  servers: ServersResponse | null;
}) {
  const healthServices = health?.services ?? [];
  const serverList = servers?.servers ?? [];

  if (healthServices.length === 0 && serverList.length === 0) {
    return (
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600}>Services</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          Services
        </Typography>
        <Stack spacing={0.5}>
          {healthServices.map((svc) => (
            <Box key={svc.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ServiceIcon status={svc.status} />
              <Typography variant="caption" sx={{ minWidth: 120 }}>
                {svc.label}
              </Typography>
              <Chip
                label={svc.status}
                size="small"
                color={svc.status === "ok" ? "success" : svc.status === "degraded" ? "warning" : "error"}
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18 }}
              />
              {svc.detail && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {svc.detail}
                </Typography>
              )}
            </Box>
          ))}
          {serverList.length > 0 && healthServices.length > 0 && (
            <Box sx={{ my: 0.5 }} />
          )}
          {serverList.map((srv: ServerInfo) => (
            <Box key={srv.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ServiceIcon status={srv.status === "listening" ? "ok" : "down"} />
              <Typography variant="caption" sx={{ minWidth: 120 }}>
                {srv.name}
              </Typography>
              <Chip
                label={srv.status}
                size="small"
                color={srv.status === "listening" ? "success" : "error"}
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18 }}
              />
              <Typography variant="caption" color="text.secondary">
                :{srv.port}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
