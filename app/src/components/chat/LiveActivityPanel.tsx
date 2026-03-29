import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import type { Channel } from "phoenix";
import type { AgentSession } from "../../hooks/useAgentStream";
import type { DesktopSessionData, BrowserSessionData } from "../../lib/extractSessions";
import { AgentActivityCard } from "./AgentActivityCard";
import { DesktopEmbed } from "./DesktopEmbed";
import { BrowserEmbed } from "./BrowserEmbed";

interface Props {
  open: boolean;
  onClose: () => void;
  agentSessions: Map<string, AgentSession>;
  desktopSession: DesktopSessionData | null;
  browserSession: BrowserSessionData | null;
  chatChannel: Channel | null;
  onSendInput: (sessionId: string, text: string) => void;
  onCancel: (sessionId: string) => void;
  onOpenTerminal: (sessionId: string) => void;
}

export function LiveActivityPanel({
  open,
  onClose,
  agentSessions,
  desktopSession,
  browserSession,
  chatChannel,
  onSendInput,
  onCancel,
  onOpenTerminal,
}: Props) {
  const sessions = Array.from(agentSessions.values());
  const isEmpty = sessions.length === 0 && !desktopSession && !browserSession;

  return (
    <Box
      sx={{
        width: 360,
        flexShrink: 0,
        borderRight: 1,
        borderColor: "divider",
        display: open ? "flex" : "none",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1, gap: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          Live Activity
        </Typography>
        <Tooltip title="Close panel">
          <IconButton size="small" onClick={onClose}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ flex: 1, overflow: "auto", px: 1, pb: 1 }}>
        {isEmpty ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 4, textAlign: "center" }}
          >
            No active sessions
          </Typography>
        ) : (
          <>
            {sessions.map((session) => (
              <AgentActivityCard
                key={session.id}
                session={session}
                onSendInput={(text) => onSendInput(session.id, text)}
                onOpenTerminal={onOpenTerminal}
                onCancel={onCancel}
                panel
              />
            ))}
            {desktopSession && (
              <DesktopEmbed
                sessionId={desktopSession.sessionId}
                channel={chatChannel}
                windowTitle={desktopSession.windowTitle}
                windowTarget={desktopSession.windowTarget}
              />
            )}
            {browserSession && (
              <BrowserEmbed
                sessionId={browserSession.sessionId}
                channel={chatChannel}
                initialUrl={browserSession.url}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
