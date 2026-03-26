import { useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
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
    <Paper
      variant="outlined"
      sx={{
        my: 1,
        overflow: "hidden",
        borderColor: isActive ? "primary.main" : "divider",
        borderLeftWidth: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
          Agent {session.id.slice(0, 8)}
        </Typography>
        <Chip
          label={session.state}
          size="small"
          color={STATE_COLORS[session.state] ?? "default"}
          sx={{ height: 20, fontSize: 11 }}
        />
        {onOpenTerminal && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTerminal(session.id);
            }}
            title="Open in terminal"
          >
            <OpenInNewIcon sx={{ fontSize: 16 }} />
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
          >
            <CancelIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        <IconButton size="small">
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 16 }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Box>

      {/* Output area */}
      <Collapse in={expanded}>
        <Box
          ref={outputRef}
          sx={{
            maxHeight: 240,
            overflow: "auto",
            px: 1.5,
            py: 1,
            bgcolor: "background.default",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {visibleLines.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Send follow-up to agent..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{
                "& .MuiInputBase-root": { fontSize: 13 },
              }}
            />
            <IconButton size="small" onClick={handleSend} disabled={!input.trim()}>
              <SendIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}

        {/* Exit code */}
        {session.state === "exited" && (
          <Box sx={{ px: 1.5, py: 0.5 }}>
            <Typography variant="caption" color={session.exitCode === 0 ? "success.main" : "error.main"}>
              Exited with code {session.exitCode ?? "unknown"}
            </Typography>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
}
