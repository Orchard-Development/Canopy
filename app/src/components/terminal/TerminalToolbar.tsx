/**
 * Mobile terminal toolbar — text input for typing commands,
 * special key buttons, and connection indicator.
 */

import { useState, useRef } from "react";
import { Box, Button, Chip, IconButton, InputBase } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface Props {
  connected: boolean;
  onKey: (key: string) => void;
}

const KEYS = [
  { label: "Tab", value: "\t" },
  { label: "Ctrl+C", value: "\x03" },
  { label: "Ctrl+D", value: "\x04" },
  { label: "Ctrl+Z", value: "\x1a" },
  { label: "Ctrl+L", value: "\x0c" },
  { label: "Esc", value: "\x1b" },
  { label: "Up", value: "\x1b[A" },
  { label: "Down", value: "\x1b[B" },
];

export function TerminalToolbar({ connected, onKey }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function send() {
    if (!input) return;
    onKey(input + "\n");
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      {/* Text input row */}
      <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.5, gap: 0.5 }}>
        <Chip
          size="small"
          label={connected ? "Live" : "Off"}
          color={connected ? "success" : "error"}
          sx={{ flexShrink: 0 }}
        />
        <InputBase
          inputRef={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); send(); }
          }}
          placeholder="Type command..."
          fullWidth
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          sx={{
            flex: 1,
            bgcolor: "action.hover",
            borderRadius: 1,
            px: 1.5,
            py: 0.5,
            fontSize: "0.875rem",
            fontFamily: "monospace",
          }}
        />
        <IconButton size="small" onClick={send} disabled={!input} color="primary">
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Special keys row */}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          px: 1,
          pb: 0.5,
          overflowX: "auto",
        }}
      >
        {KEYS.map((k) => (
          <Button
            key={k.label}
            size="small"
            variant="outlined"
            sx={{
              minWidth: "auto",
              px: 1,
              py: 0.25,
              fontSize: "0.7rem",
              flexShrink: 0,
            }}
            onClick={() => onKey(k.value)}
          >
            {k.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
