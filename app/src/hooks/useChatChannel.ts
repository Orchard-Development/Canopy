import { useEffect, useRef, useState, useCallback } from "react";
import type { Channel } from "phoenix";
import { getSocket } from "@/lib/phoenix-socket";
import { EVENTS } from "@/lib/events";

export interface ChatChannelCallbacks {
  onToken: (text: string) => void;
  onToolStart: (data: { id: string; name: string }) => void;
  onToolExecuting: (data: { id: string; name: string; args: Record<string, unknown> }) => void;
  onToolResult: (data: { id: string; name: string; result: unknown; is_error: boolean }) => void;
  onIteration: () => void;
  onDone: (data: { model?: string; provider?: string; conversationId?: string }) => void;
  onError: (message: string) => void;
  onState: (data: { state: string }) => void;
  /** Called on join when the worker is idle — DB messages are the source of truth. */
  onMessagesLoaded?: (messages: Array<Record<string, unknown>>) => void;
}

interface ProgressToolCall {
  id: string;
  name: string;
  status: string;
  args?: Record<string, unknown>;
  result?: unknown;
  is_error?: boolean;
}

export interface ChatChannelJoinReply {
  status: string;
  messages?: Array<{ type: string; [key: string]: unknown }>;
  active?: boolean;
  state?: string;
  progress?: {
    text: string;
    seq: number;
    state: string;
    tool_calls?: ProgressToolCall[];
  } | null;
}

interface UseChatChannelResult {
  connected: boolean;
  channel: Channel | null;
  sendInput: (text: string) => void;
  sendStop: () => void;
  leave: () => void;
}

/**
 * Manage a Phoenix Channel connection for a chat conversation.
 *
 * Joins "chat:{conversationId}" and routes incoming events to the
 * provided callbacks. Exposes sendInput/sendStop for client pushes.
 */
export function useChatChannel(
  conversationId: string | null,
  callbacks: ChatChannelCallbacks | null,
  lastSeenMessageId?: string | null,
): UseChatChannelResult {
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<Channel | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const lastSeqRef = useRef(0);

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    const topic = `chat:${conversationId}`;
    const params: Record<string, unknown> = {};
    if (lastSeenMessageId) {
      params.last_seen_message_id = lastSeenMessageId;
    }

    // Phoenix JS socket.channel() always pushes a NEW Channel instance to
    // socket.channels. Events are routed to ALL channels matching a topic.
    // React StrictMode, HMR, and re-renders can leave stale instances that
    // cause double-delivery. Remove them before creating ours.
    const socketChannels = (socket as unknown as { channels: Channel[] }).channels;
    for (let i = socketChannels.length - 1; i >= 0; i--) {
      if (socketChannels[i].topic === topic) {
        socketChannels[i].leave();
        socketChannels.splice(i, 1);
      }
    }

    const ch = socket.channel(topic, params);
    channelRef.current = ch;

    ch.join()
      .receive("ok", (reply: ChatChannelJoinReply) => {
        setConnected(true);
        replayCatchUp(reply, cbRef);
        // Always load persisted messages so previous turns are visible.
        if (reply.messages?.length) {
          cbRef.current?.onMessagesLoaded?.(reply.messages);
        }

        if (reply.active && reply.progress) {
          // Worker is streaming — restore accumulated progress on top.
          lastSeqRef.current = reply.progress.seq;
          cbRef.current?.onState({ state: reply.progress.state });
          if (reply.progress.text) {
            cbRef.current?.onToken(reply.progress.text);
          }
          replayToolCalls(reply.progress.tool_calls, cbRef);
        } else if (reply.active && reply.state) {
          cbRef.current?.onState({ state: reply.state });
        }
      })
      .receive("error", (reason: unknown) => {
        console.warn("[useChatChannel] join error:", reason);
        setConnected(false);
        cbRef.current?.onError(
          typeof reason === "string" ? reason : "Failed to join chat channel",
        );
      });

    ch.onClose(() => setConnected(false));
    ch.onError(() => setConnected(false));

    lastSeqRef.current = 0; // Reset sequence on new channel
    const refs = registerHandlers(ch, cbRef, lastSeqRef);

    return () => {
      unregisterHandlers(ch, refs);
      ch.leave();
      // Also splice this channel out of the socket array so it cannot
      // receive events after cleanup.
      const idx = socketChannels.indexOf(ch);
      if (idx !== -1) socketChannels.splice(idx, 1);
      channelRef.current = null;
      setConnected(false);
    };
  }, [conversationId, lastSeenMessageId]);

  const sendInput = useCallback((text: string) => {
    channelRef.current?.push("input", { text });
  }, []);

  const sendStop = useCallback(() => {
    channelRef.current?.push("stop", {});
  }, []);

  const leave = useCallback(() => {
    channelRef.current?.leave();
    channelRef.current = null;
    setConnected(false);
  }, []);

  return { connected, channel: channelRef.current, sendInput, sendStop, leave };
}

// -- Internal helpers --------------------------------------------------------

type HandlerRefs = Array<{ event: string; ref: number }>;

function registerHandlers(
  ch: Channel,
  cbRef: React.RefObject<ChatChannelCallbacks | null>,
  seqRef: React.MutableRefObject<number>,
): HandlerRefs {
  const refs: HandlerRefs = [];

  refs.push({
    event: EVENTS.chat.token,
    ref: ch.on(EVENTS.chat.token, (p: { text: string; seq?: number }) => {
      // Deduplicate: skip tokens with a seq we've already seen
      if (p.seq != null) {
        if (p.seq <= seqRef.current) return;
        seqRef.current = p.seq;
      }
      cbRef.current?.onToken(p.text);
    }),
  });

  refs.push({
    event: EVENTS.chat.toolStart,
    ref: ch.on(EVENTS.chat.toolStart, (p: { id: string; name: string }) => {
      cbRef.current?.onToolStart(p);
    }),
  });

  refs.push({
    event: EVENTS.chat.toolExecuting,
    ref: ch.on(
      EVENTS.chat.toolExecuting,
      (p: { id: string; name: string; args: Record<string, unknown> }) => {
        cbRef.current?.onToolExecuting(p);
      },
    ),
  });

  refs.push({
    event: EVENTS.chat.toolResult,
    ref: ch.on(
      EVENTS.chat.toolResult,
      (p: { id: string; name: string; result: unknown; is_error: boolean }) => {
        cbRef.current?.onToolResult(p);
      },
    ),
  });

  refs.push({
    event: EVENTS.chat.iteration,
    ref: ch.on(EVENTS.chat.iteration, () => {
      cbRef.current?.onIteration();
    }),
  });

  refs.push({
    event: EVENTS.chat.done,
    ref: ch.on(EVENTS.chat.done, (p: Record<string, unknown>) => {
      cbRef.current?.onDone(p as { model?: string; provider?: string; conversationId?: string });
    }),
  });

  refs.push({
    event: EVENTS.chat.error,
    ref: ch.on(EVENTS.chat.error, (p: { message: string }) => {
      cbRef.current?.onError(p.message);
    }),
  });

  refs.push({
    event: EVENTS.chat.state,
    ref: ch.on(EVENTS.chat.state, (p: { state: string }) => {
      cbRef.current?.onState(p);
    }),
  });

  return refs;
}

function unregisterHandlers(ch: Channel, refs: HandlerRefs): void {
  for (const { event, ref } of refs) {
    ch.off(event, ref);
  }
}

/** Replay accumulated tool calls from a progress snapshot on rejoin. */
function replayToolCalls(
  toolCalls: ProgressToolCall[] | undefined | null,
  cbRef: React.RefObject<ChatChannelCallbacks | null>,
): void {
  if (!toolCalls?.length) return;
  for (const tc of toolCalls) {
    if (tc.status === "complete" || tc.status === "error") {
      cbRef.current?.onToolResult({
        id: tc.id,
        name: tc.name,
        result: tc.result,
        is_error: tc.is_error ?? false,
      });
    } else if (tc.status === "executing") {
      cbRef.current?.onToolExecuting({
        id: tc.id,
        name: tc.name,
        args: tc.args || {},
      });
    } else {
      cbRef.current?.onToolStart({ id: tc.id, name: tc.name });
    }
  }
}

/**
 * Replay catch-up messages from the join reply.
 *
 * When re-joining a channel with a lastSeenMessageId, the server may include
 * messages that were broadcast while the client was disconnected.
 */
function replayCatchUp(
  reply: ChatChannelJoinReply,
  cbRef: React.RefObject<ChatChannelCallbacks | null>,
): void {
  if (!reply.messages?.length) return;

  for (const msg of reply.messages) {
    switch (msg.type) {
      case "token":
        cbRef.current?.onToken(msg.text as string);
        break;
      case "tool_start":
        cbRef.current?.onToolStart({ id: msg.id as string, name: msg.name as string });
        break;
      case "tool_executing":
        cbRef.current?.onToolExecuting({
          id: msg.id as string,
          name: msg.name as string,
          args: (msg.args || {}) as Record<string, unknown>,
        });
        break;
      case "tool_result":
        cbRef.current?.onToolResult({
          id: msg.id as string,
          name: msg.name as string,
          result: msg.result,
          is_error: (msg.is_error ?? false) as boolean,
        });
        break;
      case "iteration":
        cbRef.current?.onIteration();
        break;
      case "done":
        cbRef.current?.onDone(msg as { model?: string; provider?: string; conversationId?: string });
        break;
      case "error":
        cbRef.current?.onError(msg.message as string);
        break;
      case "state":
        cbRef.current?.onState({ state: msg.state as string });
        break;
    }
  }
}
