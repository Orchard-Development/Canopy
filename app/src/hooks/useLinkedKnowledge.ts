import { useEffect, useState } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { EVENTS } from "../lib/events";

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

/**
 * Subscribe to "roots:matches" events on the dashboard channel,
 * filtered to a specific session. Returns the latest set of matches.
 */
export function useLinkedKnowledge(sessionId: string) {
  const { channel } = useDashboardChannel();
  const [matches, setMatches] = useState<RootsMatch[]>([]);

  useEffect(() => {
    if (!channel || !sessionId) return;

    const ref = channel.on(EVENTS.roots.matches, (payload: RootsMatchesPayload) => {
      if (payload.session_id === sessionId) {
        setMatches(payload.matches);
      }
    });

    return () => {
      channel.off(EVENTS.roots.matches, ref);
    };
  }, [channel, sessionId]);

  return { matches, hasMatches: matches.length > 0 };
}
