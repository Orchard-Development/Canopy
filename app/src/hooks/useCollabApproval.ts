import { useEffect } from "react";
import type { Channel } from "phoenix";
import { useToast } from "./useToast";
import { api } from "../lib/api";
import { EVENTS } from "../lib/events";
import { createElement } from "react";

/**
 * Listens for collab:approval_needed events and shows persistent toasts
 * with Accept/Reject/Trust Always buttons. Bypasses the throttled event
 * bus so approvals stay visible until the user acts.
 */
export function useCollabApproval(channel: Channel | null): void {
  const toast = useToast();

  useEffect(() => {
    if (!channel) return;

    const ref = channel.on(EVENTS.collab.approvalNeeded, (payload: Record<string, unknown>) => {
      const from = (payload.from_display_name as string) || (payload.from_machine_id as string) || "Someone";
      const intent = (payload.intent as string) || "unknown";
      const envelopeId = payload.envelope_id as string;
      const intentLabel = formatIntent(intent);

      toast.show({
        message: `${from} wants to ${intentLabel}`,
        severity: "warning",
        duration: null, // persist until dismissed
        action: createElement("span", { style: { display: "flex", gap: 6 } },
          createElement("button", {
            onClick: () => { api.collabApprove(envelopeId).catch(console.error); toast.dismiss(); },
            style: btnStyle,
          }, "Accept"),
          createElement("button", {
            onClick: () => { api.collabReject(envelopeId).catch(console.error); toast.dismiss(); },
            style: { ...btnStyle, opacity: 0.7 },
          }, "Reject"),
          createElement("button", {
            onClick: () => { api.collabApprove(envelopeId, true).catch(console.error); toast.dismiss(); },
            style: { ...btnStyle, opacity: 0.7, fontSize: 11 },
          }, "Trust Always"),
        ),
      });
    });

    return () => { channel.off(EVENTS.collab.approvalNeeded, ref); };
  }, [channel, toast]);
}

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 4,
  color: "inherit",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  padding: "3px 10px",
};

function formatIntent(intent: string): string {
  const labels: Record<string, string> = {
    "session.message": "message your session",
    "session.list": "view your sessions",
    "session.watch": "watch your session",
    "task.request": "run a task on your machine",
    "ping": "ping your machine",
  };
  return labels[intent] || intent.replace(".", " ");
}
