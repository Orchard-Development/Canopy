import { useState, useEffect } from "react";
import { fetchSettings } from "../../lib/settingsCache";
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhonelinkIcon from "@mui/icons-material/Phonelink";
import type { StepProps } from "./registry";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function RemoteAccessStep({ onComplete, onBack, onSkip }: StepProps) {
  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState(generatePin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyEnabled, setAlreadyEnabled] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then((s: Record<string, string>) => {
        if (s.remote_access_enabled === "true" || s.tunnel_enabled === "true") {
          setAlreadyEnabled(true);
          setEnabled(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !alreadyEnabled) return;
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [loading, alreadyEnabled, onComplete]);

  async function handleSave() {
    if (enabled && !pin.trim()) {
      setError("Enter a PIN to protect remote access.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const settingsBody: Record<string, string> = {
        remote_access_enabled: enabled ? "true" : "false",
        tunnel_enabled: enabled ? "true" : "false",
      };
      const settingsRes = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsBody),
      });
      if (!settingsRes.ok) throw new Error(`Failed: ${settingsRes.status}`);

      if (enabled && pin.trim()) {
        const secretRes = await fetch("/api/secrets/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: "tunnel",
            alias: "pin",
            kind: "tunnel_pin",
            value: pin.trim(),
          }),
        });
        if (!secretRes.ok) throw new Error(`Failed to save PIN: ${secretRes.status}`);
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", px: 3, textAlign: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (alreadyEnabled) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", px: 3, textAlign: "center" }}>
        <PhonelinkIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Remote Access
        </Typography>
        <Stack alignItems="center" spacing={2} sx={{ py: 3 }}>
          <CheckCircleIcon
            sx={{
              fontSize: 64,
              color: "success.main",
              animation: "story-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
          <Typography
            variant="h6"
            color="success.main"
            sx={{ animation: "story-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards", opacity: 0 }}
          >
            Already enabled
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", px: 3, textAlign: "center" }}>
      <PhonelinkIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Remote Access
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Control your orchard from your phone or another device
        through a secure Cloudflare Tunnel.
      </Typography>

      <Stack spacing={3} alignItems="center">
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(_, v) => setEnabled(v)}
              color="primary"
            />
          }
          label="Enable remote access"
        />

        {enabled && (
          <Stack spacing={2} sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Access PIN"
              type="text"
              inputProps={{ inputMode: "numeric", maxLength: 20 }}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              helperText="Required to access your instance remotely."
            />
            <Button
              variant="text"
              size="small"
              onClick={() => setPin(generatePin())}
            >
              Generate new PIN
            </Button>
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ width: "100%" }}>{error}</Alert>}
      </Stack>

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
        <Button variant="text" onClick={onBack}>Back</Button>
        <Button variant="text" onClick={onSkip}>Skip</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          disableElevation
        >
          {saving ? "Saving..." : enabled ? "Enable" : "Continue"}
        </Button>
      </Stack>
    </Box>
  );
}
