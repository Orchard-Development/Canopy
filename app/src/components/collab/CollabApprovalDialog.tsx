import { useState } from "react";
import {
  Dialog, DialogContent, DialogActions,
  Typography, Button, Stack, Box, Chip, Divider,
} from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import PersonIcon from "@mui/icons-material/Person";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { api } from "../../lib/api";

export interface CollabApprovalRequest {
  envelopeId: string;
  intent: string;
  fromDisplayName: string;
  fromMachineId: string;
  toSessionId?: string;
  payload?: Record<string, unknown>;
}

interface Props {
  request: CollabApprovalRequest | null;
  onClose: () => void;
}

const INTENT_INFO: Record<string, { label: string; description: string; icon: string }> = {
  "session.message": {
    label: "Send Message",
    description: "Wants to inject a message into one of your active sessions.",
    icon: "chat",
  },
  "session.watch": {
    label: "Watch Session",
    description: "Wants to view your session output in real-time.",
    icon: "visibility",
  },
  "session.list": {
    label: "List Sessions",
    description: "Wants to see your active sessions.",
    icon: "list",
  },
  "task.request": {
    label: "Run Task",
    description: "Wants to spawn a new agent session on your machine.",
    icon: "play_arrow",
  },
  "ping": {
    label: "Ping",
    description: "Checking if your machine is reachable.",
    icon: "wifi",
  },
};

export function CollabApprovalDialog({ request, onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!request) return null;

  const info = INTENT_INFO[request.intent] || {
    label: request.intent,
    description: "Requesting collaboration access.",
    icon: "help",
  };

  const messageText = request.payload?.text as string | undefined;

  async function handleAction(action: "accept" | "reject" | "trust") {
    setLoading(action);
    try {
      if (action === "reject") {
        await api.collabReject(request!.envelopeId);
      } else {
        await api.collabApprove(request!.envelopeId, action === "trust");
      }
      onClose();
    } catch (e) {
      console.error("Collab action failed:", e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog
      open={!!request}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(4px)", bgcolor: "rgba(0,0,0,0.5)" } },
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Typography variant="overline" sx={{ color: "#9c27b0", fontWeight: 700, letterSpacing: 1.5 }}>
          Collaboration Request
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600 }}>
          {info.label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {info.description}
        </Typography>
      </Box>

      <DialogContent sx={{ px: 3, py: 1.5 }}>
        <Stack spacing={1.5}>
          {/* From → To flow */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: (t) => t.palette.action.hover,
          }}>
            <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 80 }}>
              <PersonIcon sx={{ fontSize: 20, color: "text.secondary" }} />
              <Typography variant="caption" fontWeight={600} noWrap>
                {request.fromDisplayName}
              </Typography>
              {request.fromMachineId && (
                <Chip
                  icon={<ComputerIcon sx={{ fontSize: 10 }} />}
                  label={request.fromMachineId}
                  size="small"
                  variant="outlined"
                  sx={{ height: 18, fontSize: 10, "& .MuiChip-icon": { ml: 0.5 } }}
                />
              )}
            </Stack>
            <ArrowForwardIcon sx={{ color: "text.disabled", fontSize: 18 }} />
            <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 80 }}>
              <ComputerIcon sx={{ fontSize: 20, color: "#9c27b0" }} />
              <Typography variant="caption" fontWeight={600}>
                This machine
              </Typography>
              {request.toSessionId && (
                <Chip
                  label={`Session ${request.toSessionId.slice(0, 8)}...`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
            </Stack>
          </Box>

          {/* Message preview if present */}
          {messageText && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Message
                </Typography>
                <Box sx={{
                  mt: 0.5,
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: (t) => t.palette.action.hover,
                  maxHeight: 100,
                  overflow: "auto",
                }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
                    {messageText}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button
          size="small"
          onClick={() => handleAction("trust")}
          disabled={loading !== null}
          sx={{ color: "text.secondary", fontSize: 12 }}
        >
          Trust Always
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleAction("reject")}
          disabled={loading !== null}
          color="inherit"
          sx={{ borderColor: "divider" }}
        >
          Reject
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => handleAction("accept")}
          disabled={loading !== null}
          sx={{ bgcolor: "#9c27b0", "&:hover": { bgcolor: "#7b1fa2" } }}
        >
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
}
