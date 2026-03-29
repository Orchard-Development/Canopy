import { useEffect, useRef, useState } from "react";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEvent } from "./useChannelEvent";
import { EVENTS } from "../lib/events";

/**
 * Returns true while the agent is actively processing for the given session.
 * Shows on agent:tool / agent:prompt events, clears on agent:lifecycle,
 * non-running session state, or after 5 s of inactivity.
 */
export function useTypingState(sessionId: string): boolean {
  const [showTyping, setShowTyping] = useState(false);
  const [sessionState, setSessionState] = useState("running");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { channel } = useDashboardChannel();
  const agentToolEvent = useChannelEvent<{ session_id?: string }>(channel, EVENTS.agent.tool);
  const agentPromptEvent = useChannelEvent<{ session_id?: string }>(channel, EVENTS.agent.prompt);
  const agentLifecycleEvent = useChannelEvent<{ session_id?: string }>(channel, EVENTS.agent.lifecycle);
  const stateEvent = useChannelEvent<{ id: string; state: string }>(channel, EVENTS.session.state);

  useEffect(() => {
    if (stateEvent && stateEvent.id === sessionId) {
      setSessionState(String(stateEvent.state));
    }
  }, [stateEvent, sessionId]);

  useEffect(() => {
    const toolMatch = agentToolEvent && agentToolEvent.session_id === sessionId;
    const promptMatch = agentPromptEvent && agentPromptEvent.session_id === sessionId;
    if (toolMatch || promptMatch) {
      setShowTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setShowTyping(false), 5000);
    }
  }, [agentToolEvent, agentPromptEvent, sessionId]);

  useEffect(() => {
    if (agentLifecycleEvent && agentLifecycleEvent.session_id === sessionId) {
      setShowTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  }, [agentLifecycleEvent, sessionId]);

  useEffect(() => {
    if (sessionState !== "running") {
      setShowTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  }, [sessionState]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  return showTyping;
}
