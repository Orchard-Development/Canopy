import {
  Box, Typography, IconButton, CircularProgress, Stack, alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSessionMessages } from "../../hooks/useSessionMessages";
import { ChatMessages } from "../../components/chat/ChatMessages";
import { sessionMessagesToChat } from "../../lib/sessionConvert";

interface TranscriptPanelProps {
  sessionId: string;
  label?: string;
  onBack: () => void;
}

export default function TranscriptPanel({ sessionId, label, onBack }: TranscriptPanelProps) {
  const { messages, loading, error } = useSessionMessages(sessionId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, flexShrink: 0 }}>
        <IconButton size="small" onClick={onBack} sx={{ color: "text.secondary" }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle2" color="text.primary" noWrap sx={{ flex: 1 }}>
          {label || "Transcript"}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={20} />
        </Box>
      ) : messages.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
          {error || "No messages found for this session."}
        </Typography>
      ) : (
        <ChatMessages messages={sessionMessagesToChat(messages)} fontSize={13} />
      )}
    </Box>
  );
}
