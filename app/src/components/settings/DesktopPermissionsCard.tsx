import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, Typography, Stack, Chip, Button,
  CircularProgress, Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";

interface PermissionStatus {
  screenRecording: boolean;
  accessibility: boolean;
}

function PermissionLine({ label, icon, granted }: {
  label: string;
  icon: JSX.Element;
  granted: boolean;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {icon}
      <Typography variant="body2">{label}</Typography>
      <Chip
        icon={granted ? <CheckCircleIcon /> : <ErrorIcon />}
        label={granted ? "Granted" : "Not Granted"}
        color={granted ? "success" : "error"}
        size="small"
        sx={{ ml: "auto" }}
      />
    </Stack>
  );
}

export function DesktopPermissionsCard() {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const isDesktop = !!window.orchard?.viewer?.checkPermissions;

  const check = useCallback(async () => {
    if (!window.orchard?.viewer?.checkPermissions) return;
    setChecking(true);
    try {
      const result = await window.orchard.viewer.checkPermissions();
      setStatus(result);
    } catch {
      setStatus(null);
    }
    setChecking(false);
  }, []);

  useEffect(() => { check(); }, [check]);

  if (!isDesktop) return null;

  const allGranted = status?.screenRecording && status?.accessibility;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6">Desktop Permissions</Typography>
          <Button
            size="small"
            variant="text"
            onClick={check}
            disabled={checking}
            startIcon={checking
              ? <CircularProgress size={14} color="inherit" />
              : <RefreshIcon fontSize="small" />
            }
            sx={{ ml: "auto" }}
          >
            Recheck
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Desktop mirroring and input relay require macOS permissions.
          Grant them in System Settings &gt; Privacy &amp; Security.
        </Typography>

        {status ? (
          <Stack spacing={1.5}>
            <PermissionLine
              label="Screen Recording"
              icon={<ScreenShareIcon fontSize="small" color={status.screenRecording ? "success" : "error"} />}
              granted={status.screenRecording}
            />
            <PermissionLine
              label="Accessibility"
              icon={<AccessibilityNewIcon fontSize="small" color={status.accessibility ? "success" : "error"} />}
              granted={status.accessibility}
            />
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={16} />
            <Typography variant="body2">Checking permissions...</Typography>
          </Stack>
        )}

        {status && !allGranted && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {!status.screenRecording && !status.accessibility
              ? "Screen recording and accessibility permissions are required. Enable both in System Settings, then restart the app."
              : !status.screenRecording
                ? "Screen recording is required for desktop mirroring. Enable it in System Settings > Privacy & Security > Screen Recording."
                : "Accessibility is required for input relay (click, type, scroll). Enable it in System Settings > Privacy & Security > Accessibility."}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
