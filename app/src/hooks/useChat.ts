import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { fetchSettings, persistSetting } from "./usePersistedState";
import { useChatChannel } from "./useChatChannel";
import type { ChatChannelCallbacks } from "./useChatChannel";
import type { ChatMessage, Attachment } from "../types/chat";
import type { ToolCall } from "../types/tools";

/** Convert backend tool_call records (Anthropic format) to the frontend ToolCall shape. */
function normalizeToolCalls(raw: unknown): ToolCall[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((tc: Record<string, unknown>) => ({
    id: (tc.id as string) || crypto.randomUUID(),
    name: (tc.name as string) || "",
    args: (tc.args || tc.input || {}) as Record<string, unknown>,
    status: ((tc.status as string) || "complete") as ToolCall["status"],
    result: tc.result,
    isError: (tc.isError ?? tc.is_error ?? false) as boolean,
  }));
}

const LAST_CONV_KEY = "chat.lastConversationId";

/** Build API message with attachment metadata for the backend to resolve. */
function buildApiMessage(
  m: ChatMessage,
): { role: string; content: string; attachments?: Attachment[] } {
  if (!m.attachments?.length) return { role: m.role, content: m.content };
  return { role: m.role, content: m.content, attachments: m.attachments };
}

export function useChat(projectId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [workerState, setWorkerState] = useState<string | null>(null);

  // Tracks the assistant message currently being streamed into.
  const assistantIdRef = useRef<string | null>(null);
  // Whether the initial channel join has happened for the current conversation.
  const joinedConvRef = useRef<string | null>(null);

  // ---- Restore last conversation on mount ----------------------------------

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then(async (data) => {
        if (cancelled) return;
        const lastId = data?.[LAST_CONV_KEY];
        if (!lastId) return;
        try {
          const conv = await api.getConversation(lastId);
          if (cancelled) return;
          setConversationId(lastId);
          setMessages(
            conv.messages
              .filter((m) => m.role !== "tool_context")
              .map((m) => ({
                id: String(m.id),
                role: m.role as "user" | "assistant",
                content: m.content,
                timestamp: m.created_at,
                toolCalls: normalizeToolCalls(m.tool_calls),
                attachments: Array.isArray(m.attachments)
                  ? (m.attachments as Attachment[])
                  : undefined,
              })),
          );
        } catch {
          persistSetting(LAST_CONV_KEY, "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist conversationId changes.
  useEffect(() => {
    if (restoring) return;
    persistSetting(LAST_CONV_KEY, conversationId ?? "");
  }, [conversationId, restoring]);

  // ---- State updaters (same as before) -------------------------------------

  const updateAssistant = useCallback(
    (updater: (m: ChatMessage) => ChatMessage) => {
      const id = assistantIdRef.current;
      if (!id) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    [],
  );

  const upsertToolCall = useCallback(
    (toolId: string, patch: Partial<ToolCall>) => {
      updateAssistant((m) => {
        const calls = [...(m.toolCalls || [])];
        const idx = calls.findIndex((tc) => tc.id === toolId);
        if (idx >= 0) {
          calls[idx] = { ...calls[idx], ...patch };
        } else {
          calls.push({
            id: toolId,
            name: patch.name || "",
            args: patch.args || {},
            status: patch.status || "calling",
            ...patch,
          });
        }
        return { ...m, toolCalls: calls };
      });
    },
    [updateAssistant],
  );

  // ---- Channel callbacks ---------------------------------------------------

  const channelCallbacks = useMemo<ChatChannelCallbacks>(
    () => ({
      onToken(text: string) {
        updateAssistant((m) => ({ ...m, content: m.content + text }));
      },
      onToolStart(data: { id: string; name: string }) {
        upsertToolCall(data.id, { name: data.name, status: "calling", args: {} });
      },
      onToolExecuting(data: { id: string; name: string; args: Record<string, unknown> }) {
        upsertToolCall(data.id, { name: data.name, status: "executing", args: data.args });
      },
      onToolResult(data: { id: string; name: string; result: unknown; is_error: boolean }) {
        upsertToolCall(data.id, {
          name: data.name,
          status: data.is_error ? "error" : "complete",
          result: data.result,
          isError: data.is_error,
        });
      },
      onIteration() {
        updateAssistant((m) => ({
          ...m,
          content: m.content.trimEnd() + "\n\n",
        }));
      },
      onDone() {
        setSending(false);
      },
      onError(message: string) {
        setError(message);
        // Remove empty assistant placeholder if it exists.
        const id = assistantIdRef.current;
        if (id) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== id || m.content.length > 0),
          );
        }
        setSending(false);
      },
      onState(data: { state: string }) {
        setWorkerState(data.state);
        // Reconnecting to a running worker (e.g., navigated away and back).
        // Create a placeholder so live tokens have somewhere to go.
        if (data.state === "running" && !assistantIdRef.current) {
          createAssistantPlaceholder();
          setSending(true);
        }
      },
      onMessagesLoaded(rawMessages: Array<Record<string, unknown>>) {
        // Worker finished before channel joined — replace messages from DB.
        const loaded: ChatMessage[] = (rawMessages as Array<{ id?: string | number; role?: string; content?: string; created_at?: string; tool_calls?: unknown }>)
          .filter((m) => m.role && m.role !== "tool_context")
          .map((m) => ({
            id: String(m.id ?? crypto.randomUUID()),
            role: m.role as "user" | "assistant",
            content: m.content ?? "",
            timestamp: m.created_at ?? new Date().toISOString(),
            toolCalls: normalizeToolCalls(m.tool_calls),
          }));
        if (loaded.length > 0) {
          setMessages(loaded);
          assistantIdRef.current = null;
          setSending(false);
        }
      },
    }),
    [updateAssistant, upsertToolCall],
  );

  // ---- Phoenix channel connection ------------------------------------------

  const { connected, channel: chatChannel, sendInput, sendStop, leave } = useChatChannel(
    conversationId,
    channelCallbacks,
  );

  // Track which conversationId we joined so we know when to use sendInput
  // vs a fresh chatStart.
  useEffect(() => {
    if (connected && conversationId) {
      joinedConvRef.current = conversationId;
    }
  }, [connected, conversationId]);

  // ---- Public API ----------------------------------------------------------

  const createAssistantPlaceholder = useCallback((): string => {
    const id = crypto.randomUUID();
    assistantIdRef.current = id;
    const placeholder: ChatMessage = {
      id,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholder]);
    return id;
  }, []);

  const send = useCallback(
    async (text: string, model?: string, attachments?: Attachment[]) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        attachments,
      };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);
      setError(null);

      createAssistantPlaceholder();

      const apiMessages = [...messages, userMsg].map(buildApiMessage);

      try {
        const result = await api.chatStart(
          apiMessages,
          model,
          conversationId,
          projectId,
        );
        setConversationId(result.conversationId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat failed";
        setError(msg);
        setSending(false);
      }
    },
    [messages, conversationId, projectId, createAssistantPlaceholder],
  );

  const editMessage = useCallback(
    async (index: number, newText: string, model?: string) => {
      const edited: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: newText,
        timestamp: new Date().toISOString(),
      };
      const truncated = [...messages.slice(0, index), edited];
      setMessages(truncated);
      setSending(true);
      setError(null);

      createAssistantPlaceholder();

      const apiMessages = truncated.map(buildApiMessage);

      try {
        const result = await api.chatStart(
          apiMessages,
          model,
          conversationId,
          projectId,
        );
        setConversationId(result.conversationId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat failed";
        setError(msg);
        setSending(false);
      }
    },
    [messages, conversationId, projectId, createAssistantPlaceholder],
  );

  const stop = useCallback(() => {
    sendStop();
    setSending(false);
  }, [sendStop]);

  const loadConversation = useCallback(
    async (id: string) => {
      setError(null);
      // Leave the current channel before switching.
      if (joinedConvRef.current && joinedConvRef.current !== id) {
        leave();
        joinedConvRef.current = null;
      }
      try {
        const conv = await api.getConversation(id);
        setConversationId(id);
        setMessages(
          conv.messages
            .filter((m) => m.role !== "tool_context")
            .map((m) => ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: m.created_at,
              toolCalls: normalizeToolCalls(m.tool_calls),
              attachments: Array.isArray(m.attachments)
                ? (m.attachments as Attachment[])
                : undefined,
            })),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load conversation";
        setError(msg);
      }
    },
    [leave],
  );

  const addSystemMessage = useCallback(
    (content: string, action?: ChatMessage["action"]) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content,
        timestamp: new Date().toISOString(),
        action,
      };
      setMessages((prev) => [...prev, msg]);
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    sendStop();
    leave();
    joinedConvRef.current = null;
    assistantIdRef.current = null;
    setMessages([]);
    setConversationId(null);
    setError(null);
    setSending(false);
    setWorkerState(null);
  }, [sendStop, leave]);

  return {
    messages,
    conversationId,
    sending,
    error,
    connected,
    workerState,
    chatChannel,
    send,
    editMessage,
    stop,
    loadConversation,
    addSystemMessage,
    clearError,
    reset,
    restoring,
  };
}
