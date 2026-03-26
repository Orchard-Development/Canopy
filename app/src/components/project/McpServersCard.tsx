import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { api, type ResolvedMcpServer } from "../../lib/api";

interface Props {
  projectId: string;
}

export function McpServersCard({ projectId }: Props) {
  const [servers, setServers] = useState<ResolvedMcpServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projectMcpServers(projectId)
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>MCP Servers</Typography>
          {!loading && servers.length > 0 && (
            <Chip label={servers.length} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
          )}
        </Stack>
        {loading ? (
          <Skeleton variant="rounded" height={60} />
        ) : servers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No MCP servers configured.
          </Typography>
        ) : (
          <List dense disablePadding>
            {servers.map((s) => (
              <ListItem key={s.id} disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary={s.name}
                  secondary={s.namespace}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
                <Chip
                  label={s.project_enabled ? "enabled" : "disabled"}
                  size="small"
                  color={s.project_enabled ? "success" : "default"}
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.65rem" }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
