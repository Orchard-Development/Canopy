import { useState } from "react";
import { Card, CardContent, Stack, Typography, Chip, Switch, IconButton } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { CredentialInput } from "./CredentialInput";
import type { OpenClawChannel } from "../../lib/api";

interface Props {
  channel: OpenClawChannel;
  onUpdate: (name: string, updates: Record<string, unknown>) => void;
  onRemove: (name: string) => void;
}

const STATUS_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
  connected: "success",
  disconnected: "default",
  error: "error",
  unknown: "warning",
};

export function ChannelCard({ channel, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
            {channel.name}
          </Typography>
          <Chip
            label={channel.status}
            size="small"
            color={STATUS_COLOR[channel.status] ?? "default"}
            variant="outlined"
          />
          {channel.last_message_at && (
            <Typography variant="caption" color="text.secondary">
              last: {new Date(channel.last_message_at).toLocaleTimeString()}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {channel.message_count_24h} msgs/24h
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ ml: "auto !important" }} alignItems="center">
            <Switch
              size="small"
              checked={channel.enabled}
              onChange={(_, checked) => onUpdate(channel.name, { enabled: checked })}
            />
            <IconButton size="small" onClick={() => onRemove(channel.name)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        {expanded && (
          <CredentialInput
            channel={channel.name}
            onSave={(creds) => onUpdate(channel.name, creds)}
          />
        )}
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: "pointer", mt: 0.5, display: "block" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide credentials" : "Configure credentials"}
        </Typography>
      </CardContent>
    </Card>
  );
}
