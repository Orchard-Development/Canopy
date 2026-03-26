import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { api } from "../../lib/api";
import { useRefetchOnDashboardEvent } from "../../hooks/useRefetchOnDashboardEvent";
import { EVENTS } from "../../lib/events";
import { timeAgo } from "../../lib/time";

const STATE_COLOR: Record<string, "success" | "warning" | "error" | "default" | "info"> = {
  running: "success",
  waiting: "info",
  idle: "default",
};

interface TerminalInfo {
  id: string;
  command: string;
  cwd: string;
  startedAt: string;
  exitCode?: number;
  label?: string;
  state?: string;
  projectId?: string;
}

interface Props {
  projectId: string;
}

export function SessionsCard({ projectId }: Props) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TerminalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { generation } = useRefetchOnDashboardEvent(EVENTS.session.state);

  useEffect(() => {
    api.listTerminals()
      .then((all) => setSessions(all.filter((t) => t.projectId === projectId)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, generation]);

  const active = sessions.filter((s) => s.exitCode === undefined);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Sessions</Typography>
          {!loading && active.length > 0 && (
            <Chip label={active.length} size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
          )}
        </Stack>
        {loading ? (
          <Skeleton variant="rounded" height={60} />
        ) : active.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active sessions.
          </Typography>
        ) : (
          <List dense disablePadding>
            {active.map((s) => (
              <ListItemButton
                key={s.id}
                onClick={() => navigate(`/terminal?session=${s.id}&label=${encodeURIComponent(s.label ?? s.command)}`)}
                sx={{ borderRadius: 1, py: 0.5 }}
              >
                <ListItemText
                  primary={s.label || s.command}
                  secondary={timeAgo(s.startedAt)}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600, noWrap: true }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
                {s.state && (
                  <Chip
                    label={s.state}
                    size="small"
                    color={STATE_COLOR[s.state] ?? "default"}
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.65rem" }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
