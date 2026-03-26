import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { InstalledMcp } from "./engine-types";

export function McpSyncCard({ servers }: { servers: InstalledMcp[] }) {
  const enabled = servers.filter((s) => s.enabled);
  const disabled = servers.filter((s) => !s.enabled);

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>MCP Servers</Typography>
          <Chip
            label={`${servers.length} installed`}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.65rem" }}
          />
          <Chip
            label={`${enabled.length} enabled`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontSize: "0.65rem" }}
          />
          {disabled.length > 0 && (
            <Chip
              label={`${disabled.length} disabled`}
              size="small"
              color="default"
              variant="outlined"
              sx={{ fontSize: "0.65rem" }}
            />
          )}
        </Box>
        <Stack spacing={0.5}>
          {servers.map((srv) => (
            <Box key={srv.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: srv.enabled ? "success.main" : "text.disabled",
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" sx={{ minWidth: 140 }} noWrap>
                {srv.namespace}/{srv.name}
              </Typography>
              {srv.version && (
                <Typography variant="caption" color="text.secondary">
                  {srv.version}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                {srv.command}
              </Typography>
            </Box>
          ))}
          {servers.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No MCP servers installed
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
