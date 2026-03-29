import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Divider, IconButton, InputBase, CircularProgress, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { alpha, useTheme } from "@mui/material/styles";
import { useHookLog } from "../../hooks/useHookLog";
import { useTypingState } from "../../hooks/useTypingState";
import { useImageComposer, ImagePreviewStrip } from "./ImageComposer";
import { ChatMessage } from "./ChatMessage";
import { ThinkingBubble } from "./ThinkingBubble";
import { HookToolCallBubble } from "./HookToolCallBubble";
import { TypingIndicator } from "./TypingIndicator";

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

  const { entries, loading } = useHookLog(sessionId, fetchKey);
  const showTyping = useTypingState(sessionId);
  const { images, handlePaste, handleDrop, removeImage, clearImages } = useImageComposer();

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

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries]);

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
          entries.map((entry, i) => {
            switch (entry.event_type) {
              case "prompt":
                return <ChatMessage key={i} role="user" text={entry.content} />;
              case "assistant_text":
                return <ChatMessage key={i} role="assistant" text={entry.content} />;
              case "thinking":
                return <ThinkingBubble key={i} content={entry.content ?? ""} createdAt={entry.created_at} />;
              case "tool":
                return (
                  <HookToolCallBubble
                    key={i}
                    toolName={entry.tool_name ?? "unknown"}
                    input={entry.metadata}
                    result={entry.content}
                    createdAt={entry.created_at}
                  />
                );
              case "notification":
                return <ChatMessage key={i} role="assistant" text={entry.content} variant="notification" />;
              case "stop":
                return <Divider key={i} sx={{ my: 1, opacity: 0.4 }} />;
              default:
                return null;
            }
          })
        )}
        <TypingIndicator visible={showTyping} />
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
