import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Box, Divider, IconButton, InputBase, CircularProgress, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import { alpha, useTheme } from "@mui/material/styles";
import { MarkdownContent } from "../MarkdownContent";
import { ImageLightbox } from "../chat/ImageLightbox";
import { useSessionMessages, type SessionMessage } from "../../hooks/useSessionMessages";
import { useHookLog, type HookEntry } from "../../hooks/useHookLog";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";
import { useChannelEvent } from "../../hooks/useChannelEvent";
import { EVENTS } from "../../lib/events";
import { parseBufferToMessages } from "./parseBuffer";
import { TypingIndicator } from "./TypingIndicator";
import { HookToolCallBubble } from "./HookToolCallBubble";

// Persist drafts across mode toggles (module-level, not in React state)
const drafts = new Map<string, string>();

/** Unified message type used by the merged render loop. */
interface UnifiedMessage {
  type: "prompt" | "tool" | "assistant" | "stop" | "notification";
  text?: string;
  toolName?: string;
  toolInput?: string;
  toolResult?: string;
  ts?: string;
  images?: string[];
}

/** Convert hook entries to UnifiedMessage items. */
function toHookMessages(entries: HookEntry[]): UnifiedMessage[] {
  return entries.map((e) => {
    switch (e.event_type) {
      case "prompt":
        return { type: "prompt" as const, text: e.content ?? "", ts: e.created_at };
      case "tool":
        return {
          type: "tool" as const,
          toolName: e.tool_name ?? "unknown",
          toolInput: e.metadata,
          toolResult: e.content,
          ts: e.created_at,
        };
      case "stop":
        return { type: "stop" as const, ts: e.created_at };
      case "notification":
        return { type: "notification" as const, text: e.content ?? "", ts: e.created_at };
      default:
        // subagent_start, lifecycle, etc. -- skip for now
        return null;
    }
  }).filter(Boolean) as UnifiedMessage[];
}

/** Merge hook messages with JSONL assistant messages. */
function mergeHookAndAssistant(
  hookMsgs: UnifiedMessage[],
  assistantMsgs: SessionMessage[],
): UnifiedMessage[] {
  const unified: UnifiedMessage[] = [];
  let aIdx = 0;

  for (const entry of hookMsgs) {
    unified.push(entry);
    if (entry.type === "stop" && aIdx < assistantMsgs.length) {
      const am = assistantMsgs[aIdx];
      unified.push({ type: "assistant", text: am.text, ts: am.ts, images: am.images });
      aIdx++;
    }
  }

  // Append any remaining assistant messages at end
  while (aIdx < assistantMsgs.length) {
    const am = assistantMsgs[aIdx];
    unified.push({ type: "assistant", text: am.text, ts: am.ts, images: am.images });
    aIdx++;
  }

  return unified;
}

interface PastedImage {
  dataUrl: string;
  file: File;
  /** Original URL if pasted from web, or file path if dropped */
  sourceUrl?: string;
}

interface Props {
  sessionId: string;
  bufferText: string;
  onSend: (text: string) => void;
}

export function PrettyTerminal({ sessionId, bufferText, onSend }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => drafts.get(sessionId) ?? "");
  const [userEdited, setUserEdited] = useState(false);
  const [images, setImages] = useState<PastedImage[]>([]);
  const [localMessages, setLocalMessages] = useState<SessionMessage[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [sessionState, setSessionState] = useState<string>("running");
  const [showTyping, setShowTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist draft on change
  useEffect(() => {
    if (input) drafts.set(sessionId, input);
    else drafts.delete(sessionId);
  }, [input, sessionId]);

  // Restore draft when switching sessions
  useEffect(() => {
    setInput(drafts.get(sessionId) ?? "");
    setImages([]);
    setLocalMessages([]);
    setUserEdited(false);
  }, [sessionId]);

  // Try API first (reads Claude JSONL)
  const { messages: apiMessages, loading } = useSessionMessages(sessionId, fetchKey);

  // Hook log entries (prompt, tool, stop, etc.)
  const { entries: hookEntries, loading: hookLoading } = useHookLog(sessionId, fetchKey);

  // Fallback: parse raw terminal buffer
  const parsed = useMemo(() => parseBufferToMessages(bufferText), [bufferText]);

  // Use API messages as primary source, but prefer buffer-parsed messages
  // when they have more content (API hasn't caught up with new output yet)
  const sourceMessages = useMemo(() => {
    if (apiMessages.length === 0) return parsed.messages;
    if (parsed.messages.length > apiMessages.length) return parsed.messages;
    return apiMessages;
  }, [apiMessages, parsed.messages]);

  // Build unified messages from hook log + JSONL assistant messages
  const hookUnified = useMemo(() => {
    if (hookEntries.length === 0) return null;
    const hookMsgs = toHookMessages(hookEntries);
    const assistantMsgs = apiMessages.filter((m) => m.role === "assistant");
    return mergeHookAndAssistant(hookMsgs, assistantMsgs);
  }, [hookEntries, apiMessages]);

  // Fallback: merge source messages with local messages (existing path)
  const fallbackMessages = useMemo(() => {
    if (localMessages.length === 0) return sourceMessages;
    const combined = [...sourceMessages];
    for (const lm of localMessages) {
      const alreadyInSource = sourceMessages.some(
        (sm) => sm.role === "user" && sm.text === lm.text,
      );
      if (!alreadyInSource) combined.push(lm);
    }
    return combined;
  }, [sourceMessages, localMessages]);

  // Decide which path to use: hook-based or fallback
  const useHookPath = hookEntries.length > 0 || hookLoading;

  // Clear local messages once API catches up
  useEffect(() => {
    if (localMessages.length > 0 && apiMessages.length > 0) {
      const allCovered = localMessages.every((lm) =>
        apiMessages.some((am) => am.role === "user" && am.text === lm.text),
      );
      if (allCovered) setLocalMessages([]);
    }
  }, [apiMessages, localMessages]);

  // Populate input from unsent prompt (only if user hasn't started typing)
  useEffect(() => {
    if (!userEdited && parsed.draft && !drafts.has(sessionId)) {
      setInput(parsed.draft);
    }
  }, [parsed.draft, userEdited, sessionId]);

  // Listen for session output/state via Phoenix channel to trigger re-fetch
  const { channel } = useDashboardChannel();
  const outputEvent = useChannelEvent<{ id: string }>(channel, EVENTS.session.output);
  const stateEvent = useChannelEvent<{ id: string; state: string }>(channel, EVENTS.session.state);
  const agentToolEvent = useChannelEvent<{ session_id?: string }>(channel, EVENTS.agent.tool);
  const agentPromptEvent = useChannelEvent<{ session_id?: string }>(channel, EVENTS.agent.prompt);
  const agentLifecycleEvent = useChannelEvent<{ session_id?: string }>(channel, EVENTS.agent.lifecycle);

  // Track session state for typing indicator
  useEffect(() => {
    if (stateEvent && stateEvent.id === sessionId) {
      setSessionState(String(stateEvent.state));
    }
  }, [stateEvent, sessionId]);

  // Show typing dots on PTY output or agent tool/prompt activity
  useEffect(() => {
    const outputMatch = outputEvent && outputEvent.id === sessionId;
    const toolMatch = agentToolEvent && agentToolEvent.session_id === sessionId;
    const promptMatch = agentPromptEvent && agentPromptEvent.session_id === sessionId;
    if (outputMatch || toolMatch || promptMatch) {
      setShowTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setShowTyping(false), 5000);
    }
  }, [outputEvent, agentToolEvent, agentPromptEvent, sessionId]);

  // Hide typing on stop/lifecycle (agent finished a turn)
  useEffect(() => {
    if (agentLifecycleEvent && agentLifecycleEvent.session_id === sessionId) {
      setShowTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  }, [agentLifecycleEvent, sessionId]);

  // Hide typing when session stops running
  useEffect(() => {
    if (sessionState !== "running") {
      setShowTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  }, [sessionState]);

  // Cleanup timer
  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  // Debounced re-fetch on agent channel events (tool, prompt, lifecycle)
  const agentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const ev = agentToolEvent ?? agentPromptEvent ?? agentLifecycleEvent;
    if (!ev) return;
    const sid = ev.session_id;
    if (sid !== sessionId) return;
    if (agentDebounceRef.current) clearTimeout(agentDebounceRef.current);
    agentDebounceRef.current = setTimeout(() => setFetchKey((k) => k + 1), 300);
  }, [agentToolEvent, agentPromptEvent, agentLifecycleEvent, sessionId]);

  // Cleanup agent debounce timer on unmount
  useEffect(() => () => {
    if (agentDebounceRef.current) clearTimeout(agentDebounceRef.current);
  }, []);

  useEffect(() => {
    if ((outputEvent && outputEvent.id === sessionId) || (stateEvent && stateEvent.id === sessionId)) {
      const timer = setTimeout(() => setFetchKey((k) => k + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [outputEvent, stateEvent, sessionId]);

  // Re-fetch when terminal buffer grows (new output arrived)
  const prevBufferLenRef = useRef(bufferText.length);
  useEffect(() => {
    const grew = bufferText.length - prevBufferLenRef.current;
    if (grew > 20) {
      prevBufferLenRef.current = bufferText.length;
      const timer = setTimeout(() => setFetchKey((k) => k + 1), 2000);
      return () => clearTimeout(timer);
    }
  }, [bufferText.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [hookUnified, fallbackMessages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && images.length === 0) return;

    // Add to local message list so images appear in the conversation
    const imgUrls = images.map((img) => img.dataUrl);
    setLocalMessages((prev) => [
      ...prev,
      { role: "user", text, images: imgUrls.length > 0 ? imgUrls : undefined },
    ]);

    onSend(text + "\r");
    setInput("");
    setImages([]);
    setUserEdited(false);
    drafts.delete(sessionId);
    setTimeout(() => setFetchKey((k) => k + 1), 2000);
  }, [input, images, onSend, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** Extract a source URL from clipboard/drop metadata */
  const extractSourceUrl = (transfer: DataTransfer): string | undefined => {
    // Try URI list (drag from browser image)
    const uri = transfer.getData("text/uri-list");
    if (uri && /^https?:\/\//.test(uri.trim())) return uri.trim().split("\n")[0];

    // Try HTML img src
    const html = transfer.getData("text/html");
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match?.[1] && /^https?:\/\//.test(match[1])) return match[1];
    }

    // Try plain text URL
    const text = transfer.getData("text/plain");
    if (text && /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)/i.test(text.trim())) {
      return text.trim();
    }

    return undefined;
  };

  const addImageFile = useCallback((file: File, sourceUrl?: string) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        // Use file path as source for local files
        const src = sourceUrl || ((file as any).path ? `file://${(file as any).path}` : undefined);
        setImages((prev) => [...prev, { dataUrl, file, sourceUrl: src }]);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const sourceUrl = extractSourceUrl(e.clipboardData);
        addImageFile(file, sourceUrl);
        return;
      }
    }
  }, [addImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    const sourceUrl = extractSourceUrl(e.dataTransfer);
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        addImageFile(files[i], sourceUrl);
      }
    }
  }, [addImageFile]);

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const userBg = isDark
    ? alpha(theme.palette.primary.main, 0.12)
    : alpha(theme.palette.primary.main, 0.08);

  const assistantBg = isDark
    ? alpha(theme.palette.background.paper, 0.6)
    : theme.palette.background.default;

  const scrollbarSx = {
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": {
      background: alpha(theme.palette.primary.main, 0.2),
      borderRadius: 3,
      "&:hover": { background: alpha(theme.palette.primary.main, 0.35) },
    },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Messages area */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{ flex: 1, overflow: "auto", px: 2, py: 1.5, ...scrollbarSx }}
      >
        {(loading || hookLoading) && !hookUnified && fallbackMessages.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : useHookPath && hookUnified && hookUnified.length > 0 ? (
          hookUnified.map((msg, i) => {
            if (msg.type === "prompt") {
              return (
                <MessageBubble
                  key={i}
                  message={{ role: "user", text: msg.text ?? "", images: msg.images }}
                  userBg={userBg}
                  assistantBg={assistantBg}
                  isDark={isDark}
                />
              );
            }
            if (msg.type === "tool") {
              return (
                <HookToolCallBubble
                  key={i}
                  toolName={msg.toolName ?? "unknown"}
                  input={msg.toolInput}
                  result={msg.toolResult}
                  createdAt={msg.ts}
                />
              );
            }
            if (msg.type === "assistant") {
              return (
                <MessageBubble
                  key={i}
                  message={{ role: "assistant", text: msg.text ?? "" }}
                  userBg={userBg}
                  assistantBg={assistantBg}
                  isDark={isDark}
                />
              );
            }
            if (msg.type === "stop") {
              return (
                <Divider
                  key={i}
                  sx={{ my: 1, borderColor: "divider", opacity: 0.4 }}
                />
              );
            }
            if (msg.type === "notification") {
              return (
                <MessageBubble
                  key={i}
                  message={{ role: "assistant", text: msg.text ?? "" }}
                  userBg={userBg}
                  assistantBg={assistantBg}
                  isDark={isDark}
                  isSummary
                />
              );
            }
            return null;
          })
        ) : fallbackMessages.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
            Waiting for messages...
          </Typography>
        ) : (
          fallbackMessages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              userBg={userBg}
              assistantBg={assistantBg}
              isDark={isDark}
            />
          ))
        )}
        <TypingIndicator visible={showTyping} />
      </Box>

      {/* Image previews */}
      {images.length > 0 && (
        <Box sx={{
          display: "flex", gap: 1, px: 1.5, py: 0.5,
          borderTop: 1, borderColor: "divider", overflowX: "auto",
        }}>
          {images.map((img, i) => (
            <Box key={i} sx={{ position: "relative", flexShrink: 0, maxWidth: 140 }}>
              <Box
                component="img"
                src={img.dataUrl}
                sx={{
                  height: 64, maxWidth: 140, borderRadius: 1,
                  objectFit: "cover", border: 1, borderColor: "divider",
                }}
              />
              {img.sourceUrl && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  noWrap
                  sx={{ display: "block", fontSize: 9, mt: 0.25 }}
                  title={img.sourceUrl}
                >
                  {img.sourceUrl.replace(/^(file:\/\/|https?:\/\/)/, "").slice(0, 30)}
                </Typography>
              )}
              <IconButton
                size="small"
                onClick={() => removeImage(i)}
                sx={{
                  position: "absolute", top: -6, right: -6,
                  bgcolor: "background.paper", width: 18, height: 18,
                  border: 1, borderColor: "divider",
                  "&:hover": { bgcolor: "error.main", color: "white" },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Input bar */}
      <Box
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          px: 1.5,
          py: 1,
          borderTop: images.length === 0 ? 1 : 0,
          borderColor: "divider",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.5) : theme.palette.background.paper,
        }}
      >
        <InputBase
          inputRef={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setUserEdited(true); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message..."
          multiline
          maxRows={4}
          sx={{
            flex: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            bgcolor: isDark ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.04),
            fontSize: 13,
            fontFamily: "monospace",
            "& .MuiInputBase-input": { p: 0 },
          }}
        />
        <IconButton
          size="small"
          onClick={handleSend}
          disabled={!input.trim() && images.length === 0}
          sx={{ color: "primary.main", "&.Mui-disabled": { opacity: 0.3 } }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

function SessionImageGallery({ images, hasText }: { images: string[]; hasText: boolean }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: hasText ? 1 : 0 }}>
        {images.map((src, i) => (
          <Box
            key={i}
            component="img"
            src={src}
            sx={{
              maxWidth: "100%",
              maxHeight: 300,
              borderRadius: 1,
              objectFit: "contain",
              cursor: "zoom-in",
            }}
            onClick={() => setLightbox(src)}
          />
        ))}
      </Box>
      {lightbox && (
        <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

function MessageBubble({
  message, userBg, assistantBg, isDark, isSummary,
}: {
  message: SessionMessage;
  userBg: string;
  assistantBg: string;
  isDark: boolean;
  isSummary?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.5 }}>
      <Box
        sx={{
          maxWidth: isUser ? "75%" : "90%",
          bgcolor: isUser ? userBg : assistantBg,
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          px: 2,
          py: 1,
          border: 1,
          borderColor: isUser
            ? alpha(isUser ? userBg : assistantBg, 0.4)
            : `rgba(255,255,255,${isDark ? 0.06 : 0.15})`,
          boxShadow: `0 1px 2px rgba(0,0,0,${isDark ? 0.2 : 0.06})`,
        }}
      >
        {message.images && message.images.length > 0 && (
          <SessionImageGallery images={message.images} hasText={!!message.text} />
        )}
        {isUser ? (
          message.text ? (
            <Box sx={{ fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.text}
            </Box>
          ) : null
        ) : (
          message.text ? (
            isSummary ? (
              <Box sx={{
                fontFamily: "monospace",
                fontSize: 13,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "text.secondary",
                fontStyle: "italic",
              }}>
                {message.text}
              </Box>
            ) : (
              <MarkdownContent content={message.text} />
            )
          ) : null
        )}
      </Box>
    </Box>
  );
}
