import { useState, useEffect, useRef } from "react";
import {
  Box,
  CircularProgress,
  Collapse,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { ToolCall } from "../../types/tools";

function statusIcon(s: ToolCall["status"]) {
  if (s === "complete") return <CheckCircleIcon sx={{ fontSize: 13, color: "success.main" }} />;
  if (s === "error") return <ErrorIcon sx={{ fontSize: 13, color: "error.main" }} />;
  return <CircularProgress size={12} />;
}

function truncate(value: unknown, max = 300): string {
  const s = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return s.length <= max ? s : s.slice(0, max) + "...";
}

const isActive = (s: ToolCall["status"]) => s === "calling" || s === "executing";

function formatElapsed(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

/** Summarize args into a readable one-liner for display next to the tool name. */
function argsSummary(args: Record<string, unknown>): string | null {
  const keys = Object.keys(args);
  if (keys.length === 0) return null;
  const parts: string[] = [];
  for (const k of keys) {
    const v = args[k];
    if (typeof v === "string") {
      parts.push(v.length > 80 ? v.slice(0, 77) + "..." : v);
    } else if (typeof v === "number" || typeof v === "boolean") {
      parts.push(String(v));
    }
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

/** Live elapsed-time counter. Ticks every second while active. */
function useElapsed(active: boolean): number {
  const startRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}

/** Compact single-line row for one tool call inside the expanded panel. */
function ToolRow({ tc }: { tc: ToolCall }) {
  const active = isActive(tc.status);
  const [open, setOpen] = useState(active);
  const elapsed = useElapsed(active);
  const summary = tc.args ? argsSummary(tc.args as Record<string, unknown>) : null;

  // Auto-open when a tool starts running
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          py: 0.25,
          px: 0.5,
          cursor: "pointer",
          borderRadius: 0.5,
          "&:hover": { bgcolor: "action.hover" },
          fontSize: 12,
          fontFamily: "monospace",
        }}
        onClick={() => setOpen((p) => !p)}
      >
        {statusIcon(tc.status)}
        <span style={{ opacity: 0.7 }}>{tc.name}</span>
        {active && summary && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontFamily: "monospace",
              fontSize: 11,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 300,
            }}
          >
            {summary}
          </Typography>
        )}
        {!active && tc.args && Object.keys(tc.args).length > 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace", fontSize: 11 }}>
            ({Object.keys(tc.args).join(", ")})
          </Typography>
        )}
        {active && (
          <Typography variant="caption" color="text.disabled" sx={{ ml: "auto", fontFamily: "monospace", fontSize: 11 }}>
            {formatElapsed(elapsed)}
          </Typography>
        )}
        {tc.isError && (
          <Typography variant="caption" color="error.main" sx={{ ml: "auto", fontSize: 11 }}>
            failed
          </Typography>
        )}
      </Box>
      <Collapse in={open}>
        <Box sx={{ pl: 3, pr: 1, pb: 0.5 }}>
          {tc.args && Object.keys(tc.args).length > 0 && (
            <Box component="pre" sx={preStyle}>{JSON.stringify(tc.args, null, 2)}</Box>
          )}
          {active && !tc.result && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <CircularProgress size={10} />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 11 }}>
                executing ({formatElapsed(elapsed)})
              </Typography>
            </Box>
          )}
          {tc.result !== undefined && (
            <Box
              component="pre"
              sx={{
                ...preStyle,
                maxHeight: active ? 400 : 150,
                bgcolor: tc.isError ? "error.dark" : "action.selected",
                color: tc.isError ? "error.contrastText" : "text.primary",
              }}
            >
              {truncate(tc.result, active ? 5000 : 1500)}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

const preStyle = {
  mt: 0.5,
  mb: 0.5,
  p: 0.75,
  bgcolor: "action.selected",
  borderRadius: 0.5,
  overflow: "auto",
  maxHeight: 150,
  fontSize: 11,
  whiteSpace: "pre-wrap" as const,
  m: 0,
  fontFamily: "monospace",
};

/** Compact expandable detail for tool calls, designed for the activity strip. */
export function ToolCallsSummary({ calls }: { calls: ToolCall[] }) {
  const hasActive = calls.some((c) => isActive(c.status));
  const [expanded, setExpanded] = useState(false);

  const failed = calls.filter((c) => c.status === "error").length;

  return (
    <Box sx={{ flexShrink: 0 }}>
      <Box
        onClick={() => setExpanded((p) => !p)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          px: 0.75,
          py: 0.25,
          borderRadius: 0.75,
          fontSize: 11,
          fontFamily: "monospace",
          color: "text.disabled",
          "&:hover": { bgcolor: "action.hover", color: "text.secondary" },
          transition: "all 0.15s",
        }}
      >
        {hasActive
          ? <CircularProgress size={10} />
          : failed > 0
            ? <WarningAmberIcon sx={{ fontSize: 12, color: "warning.main" }} />
            : <CheckCircleIcon sx={{ fontSize: 12, color: "success.light", opacity: 0.6 }} />}
        <ExpandMoreIcon
          sx={{
            fontSize: 14,
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </Box>
      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 0.5,
            p: 0.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 0.75,
            maxHeight: 250,
            overflow: "auto",
            bgcolor: "background.default",
          }}
        >
          {calls.map((tc) => (
            <ToolRow key={tc.id} tc={tc} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
