import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useChannel } from "./useChannel";
import { useChannelEvent } from "./useChannelEvent";
import type { TimelineItem, TimelineResponse } from "../types/timeline";

interface UseTimelineResult {
  items: TimelineItem[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

/**
 * Fetches the merged timeline for a session and subscribes to live updates.
 *
 * For local sessions, fetches from /api/session-logs/:id/timeline.
 * For remote sessions, fetches via the collab relay.
 * Subscribes to the timeline:<sessionId> Phoenix channel for real-time events.
 */
export function useTimeline(
  sessionId: string | null,
  peerNode?: string,
): UseTimelineResult {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to WebSocket channel for live updates (local sessions only)
  const channelTopic = !peerNode && sessionId ? `timeline:${sessionId}` : null;
  const { channel, connected } = useChannel(channelTopic);

  // Listen for new timeline items pushed by the channel
  const newItem = useChannelEvent<TimelineItem>(channel, "timeline:new_item");

  // Append new items from WebSocket, deduplicating by id
  useEffect(() => {
    if (!newItem) return;
    setItems((prev) => {
      if (prev.some((item) => item.id === newItem.id)) return prev;
      const next = [...prev, newItem];
      next.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      return next;
    });
  }, [newItem]);

  // Fetch initial timeline
  useEffect(() => {
    if (!sessionId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const fetcher = peerNode
      ? api.getRemoteTimeline(peerNode, sessionId)
      : api.getTimeline(sessionId);

    fetcher
      .then((resp: TimelineResponse) => {
        setItems(resp.items);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [sessionId, peerNode]);

  return { items, loading, error, connected };
}
