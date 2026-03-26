import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { EventMessage } from "./types";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions);
}

function topicSegment(topic: string): string {
  return topic.replace(/^ctx\//, "");
}

/** Build a human-readable summary from topic + payload. */
function summarize(topic: string, payload: unknown): string {
  if (typeof payload === "string") return payload.slice(0, 140);
  if (typeof payload !== "object" || payload === null) return String(payload);
  const p = payload as Record<string, unknown>;
  const sid = typeof p.id === "string" ? p.id.slice(0, 8) : null;

  // Topic-aware summaries for known event shapes
  if (topic.includes("/output") && typeof p.data === "string")
    return p.data.replace(/\x1b\[[0-9;]*m/g, "").trim().slice(0, 140) || "(empty output)";
  if (topic.includes("/started"))
    return `Session started${sid ? ` [${sid}]` : ""}`;
  if (topic.includes("/exited"))
    return `Session exited (code ${p.exit_code ?? "?"})${sid ? ` [${sid}]` : ""}`;
  if (topic.includes("/state") && typeof p.state === "string")
    return `State -> ${p.state}${sid ? ` [${sid}]` : ""}`;
  if (topic.includes("/label") && typeof p.label === "string")
    return `Label: ${p.label}${sid ? ` [${sid}]` : ""}`;
  if (topic.includes("/summary") && typeof p.summary === "string")
    return p.summary.slice(0, 140);
  if (topic.includes("/classified") && p.classification)
    return `Classified: ${JSON.stringify(p.classification).slice(0, 100)}`;
  if (topic.startsWith("agent_events"))
    return `${p.agent_type || "agent"} ${p.event || "event"}`;
  if (topic.startsWith("state:") && typeof p.key === "string")
    return `State "${p.key}" changed`;
  if (topic.includes("config_seeder") && typeof p.action === "string")
    return `Config seeder: ${p.action}`;
  if (topic.includes("session_events") && typeof p.type === "string") {
    const inner = p.payload as Record<string, unknown> | undefined;
    const text = inner && typeof inner.text === "string" ? `: ${inner.text.slice(0, 100)}` : "";
    return `${p.type}${text}`;
  }

  // Generic fallback: scan for any human-readable field
  for (const key of ["message", "title", "summary", "text", "description",
    "event", "action", "name", "label", "status", "reason", "data"]) {
    const v = p[key];
    if (typeof v === "string" && v.length > 0) return v.slice(0, 140);
  }

  return JSON.stringify(payload).slice(0, 140);
}

function isErrorTopic(topic: string): boolean {
  return topic.includes("/error") || topic.endsWith("/error");
}

function MessageRow({ msg }: { msg: EventMessage }) {
  const [open, setOpen] = useState(false);
  const payloadStr = typeof msg.payload === "string"
    ? msg.payload
    : JSON.stringify(msg.payload, null, 2);
  const summary = summarize(msg.topic, msg.payload);
  const error = isErrorTopic(msg.topic);

  return (
    <Box sx={{
      borderBottom: 1, borderColor: "divider", py: 0.5, px: 1,
      borderLeft: error ? "3px solid" : undefined,
      borderLeftColor: error ? "error.main" : undefined,
    }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "monospace", flexShrink: 0 }}>
          {formatTime(msg.timestamp)}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{ flex: 1, fontFamily: "monospace", color: error ? "error.main" : undefined }}
        >
          {summary}
        </Typography>
        <Chip
          label={topicSegment(msg.topic)}
          size="small"
          variant="outlined"
          sx={{ fontFamily: "monospace", fontSize: 10, opacity: 0.6, flexShrink: 0, maxWidth: 160 }}
        />
        <IconButton size="small" sx={{ p: 0.25 }}>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ position: "relative", mt: 0.5 }}>
          <IconButton
            size="small"
            sx={{ position: "absolute", top: 0, right: 0, zIndex: 1 }}
            onClick={() => navigator.clipboard.writeText(payloadStr)}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
              fontSize: 12,
              fontFamily: "monospace",
              overflow: "auto",
              maxHeight: 300,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {payloadStr}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

interface MessageFeedProps {
  messages: EventMessage[];
  filter: string;
  autoScroll: boolean;
}

export function MessageFeed({ messages, filter, autoScroll }: MessageFeedProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lowerFilter = filter.toLowerCase();
  const filtered = filter
    ? messages.filter((m) => m.topic.toLowerCase().includes(lowerFilter))
    : messages;

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length, autoScroll]);

  if (filtered.length === 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "text.disabled" }}>
        <Typography variant="body2">
          {messages.length === 0 ? "Waiting for messages..." : "No messages match filter"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: "auto" }}>
      {filtered.map((msg) => (
        <MessageRow key={msg.id} msg={msg} />
      ))}
      <div ref={endRef} />
    </Box>
  );
}
