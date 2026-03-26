import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { HealthData } from "./engine-types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DatabaseCard({ health }: { health: HealthData | null }) {
  const db = health?.database;

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          Database
        </Typography>
        {db ? (
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary" noWrap>
              Path: <code>{db.path}</code>
            </Typography>
            <Stack direction="row" spacing={2}>
              <Typography variant="caption" color="text.secondary">
                Size: <strong>{formatBytes(db.sizeBytes)}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Migrations: <strong>{db.migrations}</strong>
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Database info not available from health endpoint
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
