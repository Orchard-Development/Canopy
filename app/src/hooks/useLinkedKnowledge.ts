import { useEffect, useState } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { EVENTS } from "../lib/events";
import { PROXY_BASE } from "../lib/api";

export interface RootsMatch {
  source_path: string;
  summary: string;
  similarity: number;
  is_local: boolean;
}

interface RootsMatchesPayload {
  session_id: string;
  matches: RootsMatch[];
}

/** Module-level cache so matches survive terminal switches. */
const matchCache = new Map<string, RootsMatch[]>();

/**
 * Subscribe to "roots:matches" events on the dashboard channel,
 * filtered to a specific session. Returns the latest set of matches.
 * Caches results so switching terminals doesn't lose them.
 * Fetches cached matches from Engine on mount when no local cache exists.
 */
export function useLinkedKnowledge(sessionId: string) {
  const { channel } = useDashboardChannel();
  const [matches, setMatches] = useState<RootsMatch[]>(
    () => matchCache.get(sessionId) ?? [],
  );

  // Restore from local cache or fetch from Engine
  useEffect(() => {
    const cached = matchCache.get(sessionId);
    if (cached && cached.length > 0) {
      setMatches(cached);
      return;
    }
    setMatches([]);
    if (!sessionId) return;
    fetch(`${PROXY_BASE}/api/roots/matches?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data: { matches?: RootsMatch[] }) => {
        if (data.matches && data.matches.length > 0) {
          matchCache.set(sessionId, data.matches);
          setMatches(data.matches);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!channel || !sessionId) return;

    const ref = channel.on(EVENTS.roots.matches, (payload: RootsMatchesPayload) => {
      if (payload.session_id === sessionId) {
        matchCache.set(sessionId, payload.matches);
        setMatches(payload.matches);
      }
    });

    return () => {
      channel.off(EVENTS.roots.matches, ref);
    };
  }, [channel, sessionId]);

  return { matches, hasMatches: matches.length > 0 };
}
