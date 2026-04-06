import { useEffect, useRef } from "react";
import { Box, CircularProgress, Typography, Paper, Stack } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import type { TimelineItem } from "../../types/timeline";
import { MarkdownContent } from "../MarkdownContent";
import { ToolCallsSummary } from "../chat/ToolCallCard";
import type { ToolCall } from "../../types/tools";
import { InjectedMessageBubble } from "./items/InjectedMessageBubble";
import { CollabEvent } from "./items/CollabEvent";
import { RemoteTaskEvent } from "./items/RemoteTaskEvent";
import { SessionLifecycleEvent } from "./items/SessionLifecycleEvent";

interface Props {
  items: TimelineItem[];
  loading: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ item }: { item: TimelineItem }) {
  const data = item.data as { role: string; text: string; images?: string[]; toolCalls?: unknown[] };
  const isUser = data.role === "user";
  const Icon = isUser ? PersonIcon : SmartToyIcon;

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: isUser ? "rgba(25, 118, 210, 0.04)" : "transparent",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Icon sx={{ fontSize: 16, color: isUser ? "primary.main" : "secondary.main" }} />
        <Typography variant="caption" fontWeight={600} color={isUser ? "primary.main" : "secondary.main"}>
          {isUser ? "User" : "Assistant"}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
          {formatTime(item.timestamp)}
        </Typography>
      </Stack>
      <Box sx={{ fontSize: 13, "& p:first-of-type": { mt: 0 }, "& p:last-of-type": { mb: 0 } }}>
        <MarkdownContent content={data.text} />
      </Box>
      {data.toolCalls && data.toolCalls.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <ToolCallsSummary calls={data.toolCalls as ToolCall[]} />
        </Box>
      )}
    </Paper>
  );
}

function TimelineItemRenderer({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case "user_message":
    case "assistant_message":
      return <MessageBubble item={item} />;
    case "injected_message":
      return <InjectedMessageBubble data={item.data as any} timestamp={item.timestamp} />;
    case "collab_event":
      return <CollabEvent data={item.data as any} timestamp={item.timestamp} />;
    case "remote_task_event":
      return <RemoteTaskEvent data={item.data as any} timestamp={item.timestamp} />;
    case "session_lifecycle":
      return <SessionLifecycleEvent data={item.data as any} timestamp={item.timestamp} />;
    case "tool_call":
      return (
        <Box sx={{ px: 2, py: 0.5, opacity: 0.7 }}>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            Tool: {(item.data as any).name}
          </Typography>
        </Box>
      );
    default:
      return null;
  }
}

export function TimelineView({ items, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  useEffect(() => {
    if (wasAtBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [items.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
        No timeline events yet.
      </Typography>
    );
  }

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        py: 1,
      }}
    >
      {items.map((item) => (
        <Box key={item.id} sx={{ px: item.tier === "ambient" ? 0 : 1 }}>
          <TimelineItemRenderer item={item} />
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
