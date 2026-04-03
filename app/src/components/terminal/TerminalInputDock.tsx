import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import InputBase from "@mui/material/InputBase";

interface Props {
  onSend: (text: string) => void;
}

const CONTROL_CHIPS = [
  { label: "Ctrl+C", value: "\x03" },
  { label: "Esc",    value: "\x1b" },
  { label: "Tab",    value: "\t" },
  { label: "Up",     value: "\x1b[A" },
  { label: "Down",   value: "\x1b[B" },
];

const SLASH_CHIPS = [
  { label: "/commit" },
  { label: "/clear" },
  { label: "/help" },
];

export function TerminalInputDock({ onSend }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLElement>(null);

  function send() {
    if (!value) return;
    onSend(value.replace(/\n/g, "\r") + "\r");
    setValue("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
    if (e.ctrlKey) {
      switch (e.key) {
        case "c": {
          const el = e.currentTarget;
          const hasSel = el.selectionStart != null && el.selectionEnd != null && el.selectionStart !== el.selectionEnd;
          if (!hasSel) { e.preventDefault(); onSend("\x03"); }
          return;
        }
        case "d": e.preventDefault(); onSend("\x04"); return;
        case "z": e.preventDefault(); onSend("\x1a"); return;
        case "l": e.preventDefault(); onSend("\x0c"); return;
      }
      return;
    }
    switch (e.key) {
      case "Escape":    e.preventDefault(); onSend("\x1b"); return;
      case "Tab":       if (!value) { e.preventDefault(); onSend("\t"); } return;
      case "ArrowUp":   if (!value) { e.preventDefault(); onSend("\x1b[A"); } return;
      case "ArrowDown": if (!value) { e.preventDefault(); onSend("\x1b[B"); } return;
    }
  }

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <InputBase
        inputRef={inputRef}
        multiline
        maxRows={4}
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message or command..."
        inputProps={{ autoComplete: "off", autoCorrect: "off", autoCapitalize: "off", spellCheck: false }}
        sx={{ px: 1, py: 0.5, fontFamily: "monospace", fontSize: 13 }}
      />
      <Box sx={{ display: "flex", gap: 0.5, px: 1, pb: 0.5, overflowX: "auto" }}>
        {CONTROL_CHIPS.map((c) => (
          <Chip key={c.label} label={c.label} size="small" variant="outlined" onClick={() => onSend(c.value)} />
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 0.5, px: 1, pb: 0.5, overflowX: "auto" }}>
        {SLASH_CHIPS.map((c) => (
          <Chip key={c.label} label={c.label} size="small" variant="outlined" onClick={() => onSend(c.label + "\r")} />
        ))}
      </Box>
    </Box>
  );
}
