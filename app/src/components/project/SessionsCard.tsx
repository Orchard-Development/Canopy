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
import { timeAgo } from "../../lib/time";
import { useProjectData } from "../../hooks/useProjectData";

const STATE_COLOR: Record<string, "success" | "warning" | "error" | "default" | "info"> = {
  running: "success",
  waiting: "info",
  idle: "default",
};

interface Props {
  projectId: string;
}

export function SessionsCard({ projectId: _projectId }: Props) {
  const navigate = useNavigate();
  const { sessions, loading } = useProjectData();

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
