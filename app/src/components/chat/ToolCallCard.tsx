import { useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BuildIcon from "@mui/icons-material/Build";
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

/** Compact single-line row for one tool call inside the expanded panel. */
function ToolRow({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false);

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
        {tc.args && Object.keys(tc.args).length > 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace", fontSize: 11 }}>
            ({Object.keys(tc.args).join(", ")})
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
          {tc.result !== undefined && (
            <Box
              component="pre"
              sx={{
                ...preStyle,
                bgcolor: tc.isError ? "error.dark" : "action.selected",
                color: tc.isError ? "error.contrastText" : "text.primary",
              }}
            >
              {truncate(tc.result, 1500)}
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

/** Summary chip for all tool calls on a message. Shows a compact banner, expandable to details. */
export function ToolCallsSummary({ calls }: { calls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false);

  const done = calls.filter((c) => c.status === "complete").length;
  const failed = calls.filter((c) => c.status === "error").length;
  const running = calls.length - done - failed;

  const label = running > 0
    ? `${calls.length} tool calls (${running} running...)`
    : failed > 0
      ? `${calls.length} tool calls (${failed} failed)`
      : `${calls.length} tool calls`;

  const allFailed = failed > 0 && failed === calls.length;
  const icon = running > 0
    ? <CircularProgress size={14} />
    : allFailed
      ? <ErrorIcon sx={{ fontSize: 16, color: "error.main" }} />
      : failed > 0
        ? <WarningAmberIcon sx={{ fontSize: 16, color: "warning.main" }} />
        : <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />;

  return (
    <Box sx={{ mt: 0.75 }}>
      <Chip
        icon={<BuildIcon sx={{ fontSize: 14 }} />}
        avatar={icon as never}
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {icon}
            <span>{label}</span>
            <ExpandMoreIcon
              sx={{
                fontSize: 16,
                ml: 0.25,
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </Box>
        }
        size="small"
        variant="outlined"
        onClick={() => setExpanded((p) => !p)}
        sx={{
          fontFamily: "monospace",
          fontSize: 12,
          cursor: "pointer",
          borderColor: "divider",
          "& .MuiChip-label": { px: 1 },
          "& .MuiChip-icon": { display: "none" },
          "& .MuiChip-avatar": { display: "none" },
        }}
      />
      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 0.5,
            p: 0.75,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            maxHeight: 300,
            overflow: "auto",
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
