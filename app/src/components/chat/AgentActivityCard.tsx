import { useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { AgentSession } from "../../hooks/useAgentStream";

interface Props {
  session: AgentSession;
  onSendInput: (text: string) => void;
  onOpenTerminal?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
}

const STATE_COLORS: Record<string, "success" | "warning" | "default" | "error"> = {
  running: "success",
  waiting: "warning",
  exited: "default",
  unknown: "default",
};

export function AgentActivityCard({ session, onSendInput, onOpenTerminal, onCancel }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-collapse when session exits
  useEffect(() => {
    if (session.state === "exited") setExpanded(false);
  }, [session.state]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (expanded && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [session.lines.length, expanded]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendInput(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const visibleLines = session.lines.slice(-50);
  const isActive = session.state === "running" || session.state === "waiting";

  return (
    <Box
      sx={{
        my: 0.5,
        ml: 0.5,
        pl: 1,
        borderLeft: 2,
        borderColor: isActive ? "primary.main" : "divider",
        opacity: isActive ? 0.8 : 0.5,
        transition: "opacity 0.3s, border-color 0.3s",
        "&:hover": { opacity: 1 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          py: 0.25,
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {isActive && <CircularProgress size={10} sx={{ flexShrink: 0 }} />}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: "monospace", fontSize: 11, flex: 1 }}
        >
          Agent {session.id.slice(0, 8)}
        </Typography>
        <Chip
          label={session.state}
          size="small"
          color={STATE_COLORS[session.state] ?? "default"}
          sx={{ height: 18, fontSize: 10, "& .MuiChip-label": { px: 0.75 } }}
        />
        {onOpenTerminal && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTerminal(session.id);
            }}
            title="Open in terminal"
            sx={{ p: 0.25 }}
          >
            <OpenInNewIcon sx={{ fontSize: 13 }} />
          </IconButton>
        )}
        {isActive && onCancel && (
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(session.id);
            }}
            title="Cancel agent"
            sx={{ p: 0.25 }}
          >
            <CancelIcon sx={{ fontSize: 13 }} />
          </IconButton>
        )}
        {expanded ? (
          <ExpandLessIcon sx={{ fontSize: 14, color: "text.disabled" }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 14, color: "text.disabled" }} />
        )}
      </Box>

      {/* Output area */}
      <Collapse in={expanded}>
        <Box
          ref={outputRef}
          sx={{
            maxHeight: 180,
            overflow: "auto",
            py: 0.5,
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "text.secondary",
          }}
        >
          {visibleLines.length === 0 ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
              Waiting for output...
            </Typography>
          ) : (
            visibleLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))
          )}
        </Box>

        {/* Input for follow-ups (only when agent is active) */}
        {isActive && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, py: 0.25 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Follow up..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{
                "& .MuiInputBase-root": { fontSize: 11, py: 0.25 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
              }}
            />
            <IconButton size="small" onClick={handleSend} disabled={!input.trim()} sx={{ p: 0.25 }}>
              <SendIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Box>
        )}

        {/* Exit code */}
        {session.state === "exited" && (
          <Typography
            variant="caption"
            color={session.exitCode === 0 ? "success.main" : "error.main"}
            sx={{ fontSize: 10, py: 0.25, display: "block" }}
          >
            Exited {session.exitCode ?? "unknown"}
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}
