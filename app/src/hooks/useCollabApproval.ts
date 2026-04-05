import { useState, useEffect, useCallback } from "react";
import type { Channel } from "phoenix";
import { EVENTS } from "../lib/events";
import type { CollabApprovalRequest } from "../components/collab/CollabApprovalDialog";

/**
 * Listens for collab:approval_needed events and queues them for the
 * CollabApprovalDialog. Returns the current pending request and a dismiss fn.
 */
export function useCollabApproval(channel: Channel | null) {
  const [queue, setQueue] = useState<CollabApprovalRequest[]>([]);

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(EVENTS.collab.approvalNeeded, (payload: Record<string, unknown>) => {
      const request: CollabApprovalRequest = {
        envelopeId: payload.envelope_id as string,
        intent: (payload.intent as string) || "unknown",
        fromDisplayName: (payload.from_display_name as string) || (payload.from_machine_id as string) || "Someone",
        fromMachineId: (payload.from_machine_id as string) || "",
        toSessionId: payload.to_session_id as string | undefined,
        payload: typeof payload.payload === "string" ? JSON.parse(payload.payload) : payload.payload as Record<string, unknown> | undefined,
      };

      setQueue((prev) => [...prev, request]);
    });

    return () => { channel.off(EVENTS.collab.approvalNeeded, ref); };
  }, [channel]);

  const current = queue[0] || null;

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  return { current, dismiss };
}
