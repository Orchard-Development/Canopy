import { Card, CardContent, Typography, Box, Chip, Stack } from "@mui/material";
import type { OpenClawMessage } from "../../lib/api";

interface Props {
  messages: OpenClawMessage[];
}

export function MessageFeed({ messages }: Props) {
  if (messages.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Recent Messages</Typography>
        <Box sx={{ maxHeight: 300, overflow: "auto" }}>
          {messages.map((msg, i) => (
            <MessageRow key={i} message={msg} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function MessageRow({ message: msg }: { message: OpenClawMessage }) {
  const isInbound = msg.direction === "inbound";

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ py: 0.5, fontSize: 12, fontFamily: "monospace" }}
    >
      <Typography
        variant="caption"
        sx={{ color: isInbound ? "info.main" : "success.main", minWidth: 16 }}
      >
        {isInbound ? ">" : "<"}
      </Typography>
      <Chip label={msg.channel} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
        {msg.sender}
      </Typography>
      <Typography variant="caption" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {msg.text}
      </Typography>
      {msg.session_id && (
        <Chip label={msg.session_id.slice(0, 8)} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
      )}
    </Stack>
  );
}
