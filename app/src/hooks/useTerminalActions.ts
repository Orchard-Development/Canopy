import { useState, useEffect, useCallback } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent } from "./useChannelEvent";
import { EVENTS } from "../lib/events";
import { api } from "../lib/api";

export interface TerminalAction {
  id: string;
  sessionId: string;
  command: string;
  args?: string[];
  title: string;
  description?: string;
  createdAt: string;
}

/**
 * Subscribes to terminal action events via Phoenix channel.
 * Returns pending actions and a function to mark them complete.
 */
export function useTerminalActions() {
  const { channel } = useDashboardChannel();
  const [actions, setActions] = useState<TerminalAction[]>([]);

  // Seed from REST on mount
  useEffect(() => {
    api.listTerminalActions()
      .then((list) => { if (list.length > 0) setActions(list); })
      .catch(() => {});
  }, []);

  // Listen for new actions
  const createdEvent = useChannelEvent<TerminalAction>(channel, EVENTS.action.created);
  useEffect(() => {
    if (!createdEvent) return;
    setActions((prev) => {
      if (prev.some((a) => a.id === createdEvent.id)) return prev;
      return [...prev, createdEvent];
    });
  }, [createdEvent]);

  // Listen for completions (flat event, ID in payload)
  const completedEvent = useChannelEvent<{ id: string }>(channel, EVENTS.action.completed);
  useEffect(() => {
    if (!completedEvent) return;
    setActions((prev) => prev.filter((a) => a.id !== completedEvent.id));
  }, [completedEvent]);

  const completeAction = useCallback(
    (id: string) => {
      // REST call handles the completion; no channel publish needed
      api.completeTerminalAction(id).catch(() => {});
      setActions((prev) => prev.filter((a) => a.id !== id));
    },
    [],
  );

  return { actions, completeAction };
}
