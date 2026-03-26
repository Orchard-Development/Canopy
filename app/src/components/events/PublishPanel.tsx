import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Collapse,
  IconButton,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface PublishPanelProps {
  publish?: (topic: string, payload: unknown) => void;
}

export function PublishPanel({ publish }: PublishPanelProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("ctx/");
  const [payload, setPayload] = useState("{}");
  const [error, setError] = useState("");

  function handlePublish() {
    if (!topic.trim()) return;
    try {
      const parsed = JSON.parse(payload);
      publish?.(topic, parsed);
      setError("");
    } catch {
      setError("Invalid JSON");
    }
  }

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider" }}>
      <Box
        sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.5, cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <Typography variant="caption" fontWeight={600}>
          Publish
        </Typography>
        <IconButton size="small" sx={{ ml: "auto" }}>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            size="small"
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            fullWidth
            slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 13 } } }}
          />
          <TextField
            size="small"
            label="Payload (JSON)"
            value={payload}
            onChange={(e) => { setPayload(e.target.value); setError(""); }}
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            error={!!error}
            helperText={error}
            slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 13 } } }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<SendIcon />}
            onClick={handlePublish}
            disabled={!topic.trim()}
          >
            Publish
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}
