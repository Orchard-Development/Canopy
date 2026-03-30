import { useState } from "react";
import {
  Card, CardContent, Typography, Box, Chip, Stack, ToggleButtonGroup,
  ToggleButton, TextField, InputAdornment,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import SearchIcon from "@mui/icons-material/Search";
import type { OpenClawMessage } from "../../lib/api";

interface Props {
  messages: OpenClawMessage[];
}

export function MessageFeed({ messages }: Props) {
  const [filter, setFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [search, setSearch] = useState("");

  if (messages.length === 0) return null;

  const visible = messages
    .filter((m) => filter === "all" || m.direction === filter)
    .filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.text?.toLowerCase().includes(q) ||
        m.sender?.toLowerCase().includes(q) ||
        m.channel?.toLowerCase().includes(q)
      );
    });

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>Message Log</Typography>
          <Typography variant="caption" color="text.secondary">{messages.length} total</Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
          >
            <ToggleButton value="all" sx={{ px: 1.5, py: 0.25, fontSize: 11 }}>All</ToggleButton>
            <ToggleButton value="inbound" sx={{ px: 1.5, py: 0.25, fontSize: 11 }}>In</ToggleButton>
            <ToggleButton value="outbound" sx={{ px: 1.5, py: 0.25, fontSize: 11 }}>Out</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
                sx: { fontSize: 12, py: 0.25 },
              },
            }}
          />
        </Stack>

        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {visible.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No messages match.</Typography>
          ) : (
            visible.map((msg, i) => <MessageRow key={msg.id ?? i} message={msg} />)
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function MessageRow({ message: msg }: { message: OpenClawMessage }) {
  const isInbound = msg.direction === "inbound";
  const ts = msg.timestamp ? new Date(msg.timestamp) : null;
  const timeStr = ts
    ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="flex-start"
      sx={{ py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Box sx={{ pt: 0.25, color: isInbound ? "info.main" : "success.main", minWidth: 18 }}>
        {isInbound
          ? <ArrowDownwardIcon sx={{ fontSize: 14 }} />
          : <ArrowUpwardIcon sx={{ fontSize: 14 }} />}
      </Box>
      <Chip
        label={msg.channel}
        size="small"
        variant="outlined"
        sx={{ height: 18, fontSize: 10, alignSelf: "center" }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, alignSelf: "center", fontFamily: "monospace" }}>
        {msg.sender}
      </Typography>
      <Typography
        variant="caption"
        sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", alignSelf: "center" }}
        title={msg.text}
      >
        {msg.text}
      </Typography>
      {msg.session_id && (
        <Chip
          label={msg.session_id.slice(0, 8)}
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: 9, fontFamily: "monospace", alignSelf: "center" }}
          title={`Session: ${msg.session_id}`}
        />
      )}
      {timeStr && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, minWidth: 60, textAlign: "right", alignSelf: "center" }}>
          {timeStr}
        </Typography>
      )}
    </Stack>
  );
}
