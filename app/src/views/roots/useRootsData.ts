import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import { useRefetchOnDashboardEvent } from "../../hooks/useRefetchOnDashboardEvent";
import { EVENTS } from "../../lib/events";
import type { OrchardData } from "./types";

interface UseRootsDataResult {
  data: OrchardData | null;
  loading: boolean;
  error: string | null;
  indexing: boolean;
  refetch: () => void;
}

const INDEXING_POLL_MS = 3_000;

export function useRootsData(userId?: string): UseRootsDataResult {
  const [data, setData] = useState<OrchardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch when profiler finishes indexing new sessions
  const { generation, bump } = useRefetchOnDashboardEvent(EVENTS.profiler.activity);

  const refetch = useCallback(() => bump(), [bump]);

  useEffect(() => {
    let cancelled = false;

    function fetchData() {
      setLoading(true);
      api
        .getOrchardData(userId)
        .then((result) => {
          if (cancelled) return;
          // Normalize arrays so downstream components never hit undefined.length
          setData({
            ...result,
            sessions: result.sessions ?? [],
            seeds: result.seeds ?? [],
            connections: result.connections ?? [],
          });
          setError(null);

          if (result.indexing) {
            setIndexing(true);
            // Poll again after a short delay
            pollRef.current = setTimeout(fetchData, INDEXING_POLL_MS);
          } else {
            setIndexing(false);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setIndexing(false);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    fetchData();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [generation, userId]);

  return { data, loading, error, indexing, refetch };
}
