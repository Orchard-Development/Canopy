import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Skeleton,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from "@mui/material";
import RssFeedIcon from "@mui/icons-material/RssFeed";
import { useProject } from "../hooks/useProject";
import { useChannel } from "../hooks/useChannel";
import { useChannelEventBuffer } from "../hooks/useChannelEvent";
import { EVENTS } from "../lib/events";
import { api, type FeedEvent } from "../lib/api";
import { groupIntoChains, ChainCard } from "../components/FeedChain";

const EVENT_TYPES = [
  "session_analyzed",
  "skill_proposed",
  "memory_written",
  "pattern_detected",
  "approval_resolved",
  "workspace_synced",
];

type ViewMode = "timeline" | "chains";

export default function Feed() {
  const { project } = useProject();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("chains");
  const [loading, setLoading] = useState(true);

  const { channel } = useChannel("dashboard");
  const allLiveEvents = useChannelEventBuffer<FeedEvent>(channel, EVENTS.feed);
  // Filter to only events for the active project
  const liveEvents = project
    ? allLiveEvents.filter((e) => (e as FeedEvent & { project_id?: string }).project_id === project.id)
    : [];

  const load = useCallback(() => {
    if (!project) return;
    setLoading(true);
    api.listFeed(project.id, { type: filter === "all" ? undefined : filter, limit: 50 })
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [project, filter]);

  useEffect(() => { load(); }, [load]);

  const allEvents = [...liveEvents.filter((e) => !events.some((ex) => ex.id === e.id)), ...events];
  const chains = viewMode === "chains" ? groupIntoChains(allEvents) : null;

  if (!project) return null;

  return (
    <Box sx={{ pt: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <RssFeedIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Activity Feed</Typography>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="chains">Chains</ToggleButton>
          <ToggleButton value="timeline">Timeline</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, v) => setFilter(v)}
        size="small"
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <ToggleButton value="all">All</ToggleButton>
        {EVENT_TYPES.map((t) => (
          <ToggleButton key={t} value={t}>{t.replace(/_/g, " ")}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1 }} />
        ))
      ) : allEvents.length === 0 ? (
        <Alert severity="info">
          No events yet. Activity will appear here as the system processes sessions and evolves intelligence.
        </Alert>
      ) : chains ? (
        chains.map((c) => <ChainCard key={c.id} chain={c} />)
      ) : (
        allEvents.map((e) => <ChainCard key={e.id} chain={{ id: e.id, narrative: "", events: [e] }} />)
      )}
    </Box>
  );
}
