import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Skeleton,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { timeAgo } from "../../lib/time";
import { useProjectData } from "../../hooks/useProjectData";

const TYPE_COLOR: Record<string, "info" | "success" | "warning" | "default"> = {
  session_analyzed: "info",
  skill_proposed: "warning",
  memory_written: "success",
  pattern_detected: "info",
  approval_resolved: "success",
  workspace_synced: "default",
};

interface Props {
  projectId: string;
}

export function RecentActivityCard({ projectId }: Props) {
  const navigate = useNavigate();
  const { feed: events, loading } = useProjectData();

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Recent Activity</Typography>
          {!loading && events.length > 0 && (
            <Chip label={events.length} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
          )}
        </Stack>
        {loading ? (
          <Skeleton variant="rounded" height={80} />
        ) : events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No activity yet.
          </Typography>
        ) : (
          <>
            <List dense disablePadding>
              {events.map((e) => (
                <ListItem key={e.id} disablePadding sx={{ py: 0.25 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 6, color: "primary.main", mr: 1, flexShrink: 0 }} />
                  <ListItemText
                    primary={e.title}
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  />
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, ml: 1 }}>
                    <Chip
                      label={e.type.replace(/_/g, " ")}
                      size="small"
                      color={TYPE_COLOR[e.type] ?? "default"}
                      variant="outlined"
                      sx={{ height: 18, fontSize: "0.6rem" }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, textAlign: "right" }}>
                      {timeAgo(e.created_at)}
                    </Typography>
                  </Stack>
                </ListItem>
              ))}
            </List>
            <Button
              size="small"
              onClick={() => navigate(`/projects/${projectId}/feed`)}
              sx={{ mt: 1 }}
            >
              View all activity
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
