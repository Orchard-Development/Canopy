import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { useChannel } from "./useChannel";
import { useChannelEvent } from "./useChannelEvent";
import type { TimelineItem, TimelineResponse } from "../types/timeline";

/** Polling interval for remote sessions (no WebSocket available) */
const REMOTE_POLL_MS = 3000;

interface UseTimelineResult {
  items: TimelineItem[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

/**
 * Fetches the merged timeline for a session and subscribes to live updates.
 *
 * For local sessions: fetches once + WebSocket channel for real-time events.
 * For remote sessions: fetches + polls every 3s (no WebSocket to remote peer).
 */
export function useTimeline(
  sessionId: string | null,
  peerNode?: string,
): UseTimelineResult {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const fetchTimeline = useCallback((isInitial: boolean) => {
    if (!sessionId) return;
    if (isInitial) {
      setLoading(true);
      setError(null);
    }

    const fetcher = peerNode
      ? api.getRemoteTimeline(peerNode, sessionId)
      : api.getTimeline(sessionId);

    fetcher
      .then((resp: TimelineResponse) => {
        setItems(resp.items);
        setError(null);
      })
      .catch((err: Error) => {
        if (isInitial) setError(err.message);
      })
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  }, [sessionId, peerNode]);

  // Fetch initial timeline
  useEffect(() => {
    if (!sessionId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    fetchTimeline(true);
  }, [sessionId, peerNode, fetchTimeline]);

  // Poll for remote sessions (no WebSocket available for cross-machine)
  useEffect(() => {
    if (!peerNode || !sessionId) return;

    pollRef.current = setInterval(() => {
      fetchTimeline(false);
    }, REMOTE_POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [peerNode, sessionId, fetchTimeline]);

  return { items, loading, error, connected };
}
