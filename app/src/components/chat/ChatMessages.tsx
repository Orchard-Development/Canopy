import { useEffect, useRef, useState, useCallback, type KeyboardEvent } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";
import type { Channel } from "phoenix";
import type { ChatMessage, Attachment } from "../../types/chat";
import type { ToolCall } from "../../types/tools";
import { MarkdownContent } from "../MarkdownContent";
import { DispatchBanner } from "./DispatchBanner";
import { ToolCallsSummary } from "./ToolCallCard";
import { ChatFormCard } from "./ChatFormCard";
import { FileEmbed } from "./FileEmbed";
import { BrowserEmbed, BrowsingIndicator } from "./BrowserEmbed";
import { getForm } from "../../lib/forms";
import type { DispatchPayload } from "../../lib/api";

interface Props {
  messages: ChatMessage[];
  fontSize?: number;
  onDispatch?: (summary: string, payload: DispatchPayload | null, quick: boolean) => void;
  onEdit?: (index: number, newText: string) => void;
  onFormSubmit?: (result: { success: boolean; message: string; data?: Record<string, unknown> }) => void;
  chatChannel?: Channel | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 0.75 }}>
      {attachments.map((a) =>
        a.mimeType.startsWith("image/") ? (
          <Box
            key={a.id}
            component="img"
            src={a.url}
            alt={a.name}
            sx={{ maxWidth: 200, maxHeight: 120, borderRadius: 1, objectFit: "cover" }}
          />
        ) : (
          <Box
            key={a.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              bgcolor: "rgba(255,255,255,0.15)",
              borderRadius: 1,
              fontSize: 12,
            }}
          >
            <InsertDriveFileIcon sx={{ fontSize: 16 }} />
            {a.name}
          </Box>
        ),
      )}
    </Box>
  );
}

function UserBubble({
  message,
  index,
  fontSize = 14,
  onEdit,
}: {
  message: ChatMessage;
  index: number;
  fontSize?: number;
  onEdit?: (index: number, newText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const submit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    onEdit?.(index, trimmed);
    setEditing(false);
  }, [draft, message.content, index, onEdit]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") setEditing(false);
    },
    [submit],
  );

  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="flex-end"
      sx={{ width: "100%" }}
    >
      <Box sx={{ maxWidth: "80%" }}>
        {editing ? (
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5 }}>
            <TextField
              multiline
              minRows={1}
              maxRows={8}
              fullWidth
              size="small"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              slotProps={{ input: { sx: { fontSize: 16 } } }}
            />
            <IconButton size="small" onClick={submit} color="primary">
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setEditing(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box
            sx={{ position: "relative", "&:hover .edit-btn": { opacity: 1 } }}
          >
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                borderRadius: 2,
                whiteSpace: "pre-wrap",
                fontSize,
                lineHeight: 1.6,
              }}
            >
              {message.attachments?.length ? (
                <UserAttachments attachments={message.attachments} />
              ) : null}
              {message.content}
            </Paper>
            {onEdit && (
              <Tooltip title="Edit & resend">
                <IconButton
                  className="edit-btn"
                  size="small"
                  onClick={() => { setDraft(message.content); setEditing(true); }}
                  sx={{
                    position: "absolute",
                    left: -32,
                    top: 4,
                    opacity: 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 0.25, display: "block", textAlign: "right" }}
        >
          {formatTime(message.timestamp)}
        </Typography>
      </Box>
      <PersonIcon sx={{ mt: 0.5, color: "text.secondary", fontSize: 20 }} />
    </Stack>
  );
}

interface MediaItem {
  type: "image" | "video";
  url: string;
}

function extractMedia(toolCalls?: ToolCall[]): MediaItem[] {
  if (!toolCalls) return [];
  const items: MediaItem[] = [];

  for (const tc of toolCalls) {
    if (tc.status !== "complete" || tc.isError) continue;
    const result = tc.result as Record<string, unknown> | undefined;
    if (!result) continue;

    // Prefer local files (persist across refresh), fall back to CDN URLs
    const localFiles = result.local_files as string[] | undefined;

    if (tc.name === "generate_image") {
      if (localFiles?.length) {
        for (const f of localFiles) items.push({ type: "image", url: f });
      } else {
        const data = result.data as Array<{ url?: string }> | undefined;
        for (const d of data ?? []) if (d.url) items.push({ type: "image", url: d.url });
      }
    }

    if (tc.name === "generate_video") {
      if (localFiles?.length) {
        for (const f of localFiles) items.push({ type: "video", url: f });
      } else {
        const video = result.video as { url?: string } | undefined;
        if (video?.url) items.push({ type: "video", url: video.url });
      }
    }
  }

  return items;
}

function extractFormData(
  toolCalls?: ToolCall[],
): { formType: string; prefill?: Record<string, string> } | null {
  if (!toolCalls) return null;
  for (const tc of toolCalls) {
    if (tc.name !== "show_form") continue;
    if (tc.status !== "complete" || tc.isError) continue;
    const result = tc.result as Record<string, unknown> | undefined;
    if (result?.form_type) {
      return {
        formType: result.form_type as string,
        prefill: result.prefill as Record<string, string> | undefined,
      };
    }
  }
  return null;
}

interface FileEmbedData {
  url: string;
  mimeType: string;
  title?: string;
  filename: string;
  size: number;
}

function extractFileEmbeds(toolCalls?: ToolCall[]): FileEmbedData[] {
  if (!toolCalls) return [];
  const items: FileEmbedData[] = [];

  for (const tc of toolCalls) {
    if (tc.name !== "show_file") continue;
    if (tc.status !== "complete" || tc.isError) continue;
    const result = tc.result as Record<string, unknown> | undefined;
    if (!result?.show_file) continue;

    items.push({
      url: result.url as string,
      mimeType: result.mime_type as string,
      title: result.title as string | undefined,
      filename: result.filename as string,
      size: result.size as number,
    });
  }

  return items;
}

interface BrowserSessionData {
  sessionId: string;
  url: string;
}

function extractBrowserSession(toolCalls?: ToolCall[]): BrowserSessionData | null {
  if (!toolCalls) return null;

  // Find the last completed browse_url call
  let last: BrowserSessionData | null = null;
  for (const tc of toolCalls) {
    if (tc.name !== "browse_url") continue;
    if (tc.status !== "complete" || tc.isError) continue;
    const result = tc.result as Record<string, unknown> | undefined;
    if (!result?.session_id) continue;
    last = {
      sessionId: result.session_id as string,
      url: result.url as string,
    };
  }
  return last;
}

function isBrowsing(toolCalls?: ToolCall[]): boolean {
  if (!toolCalls) return false;
  return toolCalls.some(
    (tc) => tc.name === "browse_url" && (tc.status === "calling" || tc.status === "executing"),
  );
}

function GeneratedMedia({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
      {items.map((item, i) =>
        item.type === "video" ? (
          <Box
            key={i}
            component="video"
            src={item.url}
            controls
            autoPlay
            loop
            muted
            sx={{ maxWidth: "100%", maxHeight: 400, borderRadius: 1 }}
          />
        ) : (
          <Box
            key={i}
            component="img"
            src={item.url}
            alt="Generated image"
            sx={{
              maxWidth: "100%",
              maxHeight: 400,
              borderRadius: 1,
              cursor: "pointer",
              "&:hover": { opacity: 0.9 },
            }}
            onClick={() => window.open(item.url, "_blank")}
          />
        ),
      )}
    </Box>
  );
}

function MediaGeneratingIndicator({ toolCalls }: { toolCalls?: ToolCall[] }) {
  if (!toolCalls) return null;

  const generating = toolCalls.filter(
    (tc) =>
      (tc.name === "generate_video" || tc.name === "generate_image") &&
      (tc.status === "calling" || tc.status === "executing"),
  );
  if (generating.length === 0) return null;

  const isVideo = generating.some((tc) => tc.name === "generate_video");
  const label = isVideo ? "Generating video..." : "Generating image...";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
      <CircularProgress size={20} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** Build a fallback description when the LLM produced tool calls but no text. */
function toolCallFallback(toolCalls?: ToolCall[]): string | null {
  if (!toolCalls?.length) return null;
  for (const tc of toolCalls) {
    if (tc.name === "dispatch_to_agent") {
      const prompt = (tc.args as Record<string, unknown>)?.prompt as string | undefined;
      if (prompt) return `Dispatching agent: ${prompt.length > 120 ? prompt.slice(0, 117) + "..." : prompt}`;
      return "Dispatching to an agent...";
    }
    if (tc.name === "create_proposal" || tc.name === "build_proposal") {
      const title = (tc.args as Record<string, unknown>)?.title as string | undefined;
      return title ? `Creating proposal: ${title}` : "Creating a proposal...";
    }
  }
  const names = toolCalls.map((tc) => tc.name).join(", ");
  return `Running: ${names}`;
}

function AssistantBubble({
  message,
  fontSize = 14,
  onDispatch,
  onFormSubmit,
  chatChannel,
}: {
  message: ChatMessage;
  fontSize?: number;
  onDispatch?: (summary: string, payload: DispatchPayload | null, quick: boolean) => void;
  onFormSubmit?: (result: { success: boolean; message: string; data?: Record<string, unknown> }) => void;
  chatChannel?: Channel | null;
}) {
  const media = extractMedia(message.toolCalls);
  const fileEmbeds = extractFileEmbeds(message.toolCalls);
  const formData = extractFormData(message.toolCalls);
  const formDef = formData ? getForm(formData.formType) : null;
  const fallback = !message.content ? toolCallFallback(message.toolCalls) : null;
  const browserSession = extractBrowserSession(message.toolCalls);
  const browsing = isBrowsing(message.toolCalls);

  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="flex-start"
      sx={{ width: "100%" }}
    >
      <SmartToyIcon sx={{ mt: 0.5, color: "primary.main", fontSize: 20 }} />
      <Box sx={{ maxWidth: "80%" }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1,
            bgcolor: "action.hover",
            color: "text.primary",
            borderRadius: 2,
            fontSize,
            lineHeight: 1.6,
            "& > :first-child": { mt: 0 },
            "& > :last-child": { mb: 0 },
          }}
        >
          {message.content
            ? <MarkdownContent content={message.content} />
            : fallback
              ? <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>{fallback}</Typography>
              : !message.toolCalls?.length && <StreamingCursor />}
          <MediaGeneratingIndicator toolCalls={message.toolCalls} />
          <GeneratedMedia items={media} />
          {browsing && <BrowsingIndicator />}
          {browserSession && (
            <BrowserEmbed
              sessionId={browserSession.sessionId}
              channel={chatChannel ?? null}
              initialUrl={browserSession.url}
            />
          )}
          {fileEmbeds.map((fe, i) => (
            <FileEmbed key={i} {...fe} />
          ))}
        </Paper>
        {formDef && (
          <ChatFormCard
            form={formDef}
            prefill={formData?.prefill}
            onSubmitted={onFormSubmit}
          />
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsSummary calls={message.toolCalls} />
        )}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 0.25, display: "block" }}
        >
          {formatTime(message.timestamp)}
        </Typography>
        {message.dispatch?.suggested && onDispatch && (
          <DispatchBanner
            summary={message.dispatch.summary}
            ready={!!message.dispatchPayload}
            quick={!!message.dispatch.quick}
            onDispatch={(s) =>
              onDispatch(s, message.dispatchPayload ?? null, !!message.dispatch?.quick)
            }
          />
        )}
      </Box>
    </Stack>
  );
}

function SystemBubble({ message, fontSize = 13 }: { message: ChatMessage; fontSize?: number }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 0.75,
          bgcolor: "action.selected",
          borderRadius: 2,
          fontSize,
          color: "text.secondary",
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
        {message.content}
        {message.action && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              if (message.action!.onAction) message.action!.onAction();
              else if (message.action!.path) navigate(message.action!.path);
            }}
            sx={{ ml: 1, textTransform: "none", whiteSpace: "nowrap", py: 0, fontSize: 12 }}
          >
            {message.action.label}
          </Button>
        )}
      </Paper>
    </Box>
  );
}

function StreamingCursor() {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: 8,
        height: 16,
        bgcolor: "text.secondary",
        borderRadius: 0.5,
        animation: "blink 1s step-end infinite",
        "@keyframes blink": {
          "50%": { opacity: 0 },
        },
      }}
    />
  );
}

export function ChatMessages({ messages, fontSize = 14, onDispatch, onEdit, onFormSubmit, chatChannel }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          What can I help you with?
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        py: 2,
        px: 1,
      }}
    >
      {messages.map((msg, i) => {
        if (msg.role === "system") {
          return <SystemBubble key={msg.id} message={msg} fontSize={fontSize - 1} />;
        }
        if (msg.role === "user") {
          return <UserBubble key={msg.id} message={msg} index={i} fontSize={fontSize} onEdit={onEdit} />;
        }
        // Hide empty assistant bubbles, but keep the last one visible for streaming cursor
        if (!msg.content && !msg.toolCalls?.length && !msg.dispatch?.suggested && i < messages.length - 1) return null;
        return <AssistantBubble key={msg.id} message={msg} fontSize={fontSize} onDispatch={onDispatch} onFormSubmit={onFormSubmit} chatChannel={chatChannel} />;
      })}
      <div ref={endRef} />
    </Box>
  );
}
