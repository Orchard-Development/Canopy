import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import { TerminalPanel } from "./TerminalPanel";
import type { TerminalAction } from "../../hooks/useTerminalActions";

interface Props {
  action: TerminalAction | null;
  open: boolean;
  onClose: () => void;
  onDone: (id: string) => void;
}

export function TerminalActionModal({ action, open, onClose, onDone }: Props) {
  const [exited, setExited] = useState(false);
  const [ready, setReady] = useState(false);

  if (!action) return null;

  function handleDone() {
    setExited(false);
    setReady(false);
    onDone(action!.id);
  }

  function handleClose() {
    setExited(false);
    setReady(false);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(4px)" } } }}
      TransitionProps={{ onEntered: () => setReady(true) }}
    >
      <DialogContent sx={{ p: 3, pb: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <TerminalIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {action.title}
            </Typography>
            {action.description && (
              <Typography variant="body2" color="text.secondary">
                {action.description}
              </Typography>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            height: 360,
            borderRadius: 1,
            overflow: "hidden",
            border: 1,
            borderColor: "divider",
          }}
        >
          {ready && (
            <TerminalPanel
              sessionId={action.sessionId}
              onExit={() => setExited(true)}
            />
          )}
        </Box>
        {exited && (
          <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
            Process exited. Click Done to dismiss.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Close</Button>
        <Button variant="contained" onClick={handleDone} disableElevation>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
