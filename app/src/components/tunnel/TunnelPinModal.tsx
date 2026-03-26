import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  TextField,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import BlockIcon from "@mui/icons-material/Block";
import { useTunnelAuth } from "../../hooks/useTunnelAuth";

export function TunnelPinModal() {
  const { pinRequired, hostAuthStatus, clearPin, requestHostAuth } = useTunnelAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!pin) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/tunnel/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        // Session cookie is set -- reload to enter the app
        window.location.reload();
        return;
      } else {
        setError("Wrong PIN");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Waiting for host approval
  if (hostAuthStatus === "waiting") {
    return (
      <Dialog
        open
        slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
      >
        <DialogContent sx={{ p: 4, textAlign: "center", minWidth: 320 }}>
          <Box sx={{ mb: 2 }}>
            <HourglassTopIcon sx={{ fontSize: 48, color: "warning.main" }} />
          </Box>
          <Typography variant="h6" gutterBottom>
            Waiting for Authorization
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The host needs to approve your connection.
          </Typography>
          <CircularProgress size={32} />
        </DialogContent>
      </Dialog>
    );
  }

  // Host denied the connection
  if (hostAuthStatus === "denied") {
    return (
      <Dialog
        open
        slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
      >
        <DialogContent sx={{ p: 4, textAlign: "center", minWidth: 320 }}>
          <Box sx={{ mb: 2 }}>
            <BlockIcon sx={{ fontSize: 48, color: "error.main" }} />
          </Box>
          <Typography variant="h6" gutterBottom>
            Connection Denied
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The host declined your connection request.
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            onClick={requestHostAuth}
            disableElevation
          >
            Try Again
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // PIN entry
  return (
    <Dialog
      open={pinRequired}
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
    >
      <DialogContent sx={{ p: 4, textAlign: "center", minWidth: 320 }}>
        <Box sx={{ mb: 2 }}>
          <LockIcon sx={{ fontSize: 48, color: "primary.main" }} />
        </Box>
        <Typography variant="h6" gutterBottom>
          Remote Access
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your PIN to control this instance.
        </Typography>
        <TextField
          fullWidth
          label="PIN"
          type="password"
          inputProps={{ inputMode: "numeric", maxLength: 20 }}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
          sx={{ mb: 2 }}
        />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={!pin || submitting}
          disableElevation
        >
          {submitting ? "Verifying..." : "Unlock"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
