import { useState } from "react";
import { Stack, Typography, Button, TextField, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ChannelCard } from "./ChannelCard";
import type { OpenClawChannel } from "../../lib/api";

const KNOWN_CHANNELS = [
  "telegram", "whatsapp", "discord", "slack", "signal",
  "imessage", "matrix", "irc", "teams", "line",
];

interface Props {
  channels: OpenClawChannel[];
  onUpdate: (name: string, updates: Record<string, unknown>) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}

export function ChannelList({ channels, onUpdate, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim().toLowerCase());
    setNewName("");
    setAdding(false);
  };

  return (
    <Stack spacing={0}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Channels</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAdding(!adding)}
        >
          Add Channel
        </Button>
      </Stack>

      {adding && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="e.g. telegram, discord, slack"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            helperText={`Known: ${KNOWN_CHANNELS.join(", ")}`}
          />
          <Button size="small" variant="contained" onClick={handleAdd} disabled={!newName.trim()}>
            Add
          </Button>
        </Stack>
      )}

      {channels.length === 0 && !adding && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No channels yet. Click "Add Channel" to connect a messaging platform.
        </Alert>
      )}

      {channels.map((ch) => (
        <ChannelCard key={ch.name} channel={ch} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </Stack>
  );
}
