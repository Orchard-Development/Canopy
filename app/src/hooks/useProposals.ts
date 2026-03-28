import { useState, useEffect, useCallback } from "react";
import { useActiveProject } from "./useActiveProject";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent } from "./useChannelEvent";
import { EVENTS } from "../lib/events";
import { api } from "../lib/api";

export interface ProposalSummary {
  slug: string;
  title: string;
  date: string;
  status: string;
  repo: string;
  ticket: string | null;
  taskCount: number;
  tasksByStatus: Record<string, number>;
}

/**
 * Tracks actionable proposals (draft + in-progress) via REST seed and channel updates.
 * Powers the ProposalFab badge and modal.
 */
export function useProposals() {
  const { project } = useActiveProject();
  const projectId = project?.id;
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [unseenSlugs, setUnseenSlugs] = useState<Set<string>>(new Set());
  const [lastCreated, setLastCreated] = useState<{ slug: string; title?: string } | null>(null);

  const { channel } = useDashboardChannel();

  // Channel listener for proposal created events
  const proposalCreated = useChannelEvent<{ data: { slug?: string; title?: string } }>(
    channel,
    EVENTS.proposals.created,
  );

  // Channel listener for proposal changed events
  const proposalChanged = useChannelEvent(channel, EVENTS.proposals.changed);

  const load = useCallback(() => {
    api.listProposals(projectId ?? undefined)
      .then((list) => {
        const actionable = list.filter((p) => p.status === "draft" || p.status === "in-progress");
        setProposals(actionable);
      })
      .catch(() => {});
  }, [projectId]);

  // Seed from REST on mount
  useEffect(() => { load(); }, [load]);

  // React to proposal:created from Phoenix channel
  useEffect(() => {
    if (!proposalCreated) return;
    const slug = proposalCreated.data?.slug;
    if (slug) {
      setUnseenSlugs((prev) => new Set(prev).add(slug));
    }
    setLastCreated({ slug: slug || "", title: proposalCreated.data?.title });
    load();
  }, [proposalCreated, load]);

  // React to proposal:changed from Phoenix channel
  useEffect(() => {
    if (!proposalChanged) return;
    load();
  }, [proposalChanged, load]);

  const markSeen = useCallback(() => {
    setUnseenSlugs(new Set());
  }, []);

  const dismissLastCreated = useCallback(() => setLastCreated(null), []);

  return { proposals, unseenSlugs, unseenCount: unseenSlugs.size, lastCreated, dismissLastCreated, markSeen, reload: load };
}
