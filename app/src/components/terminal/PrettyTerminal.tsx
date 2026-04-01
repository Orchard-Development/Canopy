import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Divider, IconButton, InputBase, CircularProgress, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import { alpha, useTheme } from "@mui/material/styles";
import { useHookLog } from "../../hooks/useHookLog";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";
import { useStreamingText } from "../../hooks/useStreamingText";
import { useImageComposer, ImagePreviewStrip } from "./ImageComposer";
import { ChatMessage } from "./ChatMessage";
import { ThinkingBubble } from "./ThinkingBubble";
import { ToolCallGroup, groupToolEntries } from "./ToolCallGroup";
import { StreamingAssistantBubble } from "./StreamingAssistantBubble";

// Persist drafts across mode toggles (module-level, not in React state)
const drafts = new Map<string, string>();

interface Props {
  sessionId: string;
  onSend: (text: string) => void;
}

export function PrettyTerminal({ sessionId, onSend }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => drafts.get(sessionId) ?? "");
  const [fetchKey, setFetchKey] = useState(0);

  const { channel } = useDashboardChannel();
  const { entries, loading } = useHookLog(sessionId, fetchKey);
  const { text: streamText, state: streamState, streamingStartedAt, reset: resetStream } = useStreamingText(sessionId, channel);
  const { images, handlePaste, handleDrop, removeImage, clearImages } = useImageComposer();

  // Subscribe to per-session PTY output (enables agent:output streaming)
  // No unsubscribe on unmount -- server does not reference-count; cleanup happens on channel disconnect.
  useEffect(() => {
    if (!channel || !sessionId) return;
    channel.push("subscribe:session", { session_id: sessionId });
  }, [channel, sessionId]);

  // When committed assistant_text entries for the current turn arrive,
  // reset the streaming buffer so the bubble is replaced cleanly.
  useEffect(() => {
    if (streamState !== "stop" || !streamingStartedAt) return;
    const hasCommitted = entries.some(
      (e) => e.event_type === "assistant_text" && new Date(e.created_at).getTime() >= streamingStartedAt,
    );
    if (hasCommitted) {
      requestAnimationFrame(() => resetStream());
    }
  }, [entries, streamState, streamingStartedAt, resetStream]);

  // Persist draft on change
  useEffect(() => {
    if (input) drafts.set(sessionId, input);
    else drafts.delete(sessionId);
  }, [input, sessionId]);

  // Restore draft when switching sessions
  useEffect(() => {
    setInput(drafts.get(sessionId) ?? "");
    clearImages();
  }, [sessionId, clearImages]);

  // Auto-scroll to bottom on new entries or streaming text (pause during stop transition)
  useEffect(() => {
    if (streamState === "stop") return;
    const el = scrollRef.current;
    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries, streamText, streamState]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && images.length === 0) return;
    onSend(text + "\r");
    setInput("");
    clearImages();
    drafts.delete(sessionId);
    setTimeout(() => setFetchKey((k) => k + 1), 2000);
  }, [input, images, onSend, sessionId, clearImages]);

  const isStreaming = streamState === "streaming";

  const handleStop = useCallback(() => {
    onSend("\x03");
  }, [onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollbarSx = {
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": {
      background: alpha(theme.palette.primary.main, 0.2),
      borderRadius: 3,
      "&:hover": { background: alpha(theme.palette.primary.main, 0.35) },
    },
  };

  // Suppress committed assistant_text entries for the current in-flight turn
  // so they don't overlap the streaming bubble.
  const bubbleActive = streamState !== "idle";
  const visibleEntries = bubbleActive && streamingStartedAt
    ? entries.filter(
        (e) =>
          e.event_type !== "assistant_text" ||
          new Date(e.created_at).getTime() < streamingStartedAt,
      )
    : entries;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Messages area */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{ flex: 1, overflow: "auto", px: 2, py: 1.5, ...scrollbarSx }}
      >
        {loading && entries.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : entries.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
            Waiting for messages...
          </Typography>
        ) : (
          groupToolEntries(visibleEntries).map((item, i) => {
            if (item.kind === "tool_group") {
              return <ToolCallGroup key={i} entries={item.entries} />;
            }
            const entry = item.entry;
            switch (entry.event_type) {
              case "prompt":
                return <ChatMessage key={i} role="user" text={entry.content} />;
              case "assistant_text":
                return <ChatMessage key={i} role="assistant" text={entry.content} />;
              case "thinking":
                return <ThinkingBubble key={i} content={entry.content ?? ""} createdAt={entry.created_at} />;
              case "notification":
                return <ChatMessage key={i} role="assistant" text={entry.content} variant="notification" />;
              case "stop":
                return <Divider key={i} sx={{ my: 1, opacity: 0.4 }} />;
              default:
                return null;
            }
          })
        )}
        <StreamingAssistantBubble text={streamText} state={streamState} />
      </Box>

      {/* Image previews */}
      <ImagePreviewStrip images={images} onRemove={removeImage} />

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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isStreaming ? "Waiting for response..." : "Send a message..."}
          disabled={isStreaming}
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
        {isStreaming ? (
          <IconButton
            size="small"
            onClick={handleStop}
            sx={{ color: "error.main" }}
          >
            <StopIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton
            size="small"
            onClick={handleSend}
            disabled={!input.trim() && images.length === 0}
            sx={{ color: "primary.main", "&.Mui-disabled": { opacity: 0.3 } }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
