import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, Typography, Stack, TextField, Switch, FormControlLabel,
  Button, Alert, CircularProgress, Chip, Box, Collapse,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  IconButton, Tooltip, Link,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import PublicOffIcon from "@mui/icons-material/PublicOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useSearchParams } from "react-router-dom";
import { useDashboardChannel } from "@/hooks/useDashboardChannel";
import { useChannelEvent } from "@/hooks/useChannelEvent";
import { EVENTS } from "@/lib/events";
import { TunnelAllowlistSection } from "./TunnelAllowlistSection";
import { TunnelSessionsSection } from "./TunnelSessionsSection";

interface TunnelStatus {
  status: "stopped" | "starting" | "running" | "error";
  url: string | null;
  pin: string | null;
  restartCount: number;
}

interface Props {
  tunnelName: string;
  hostAuth: string;
  tunnelEnabled: string;
  allowAnyUser: string;
  onUpdate: (key: string, value: string) => void;
}

export function TunnelCard({ tunnelName, hostAuth, tunnelEnabled, allowAnyUser, onUpdate }: Props) {
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setParams] = useSearchParams();

  // Channel-driven status updates (the BEAM way)
  const { channel } = useDashboardChannel();
  const statusEvent = useChannelEvent<{ data: TunnelStatus }>(
    channel,
    EVENTS.tunnel.status,
  );

  // Apply channel pushes immediately
  useEffect(() => {
    if (statusEvent?.data) {
      setTunnel(statusEvent.data);
      setToggling(false);
    }
  }, [statusEvent]);

  // Initial fetch on mount
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tunnel/status");
      setTunnel(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function connect() {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch("/api/tunnel/start", { method: "POST" });
      const result = await res.json();
      if (result.error) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setToggling(false);
    }
  }

  async function disconnect() {
    setToggling(true);
    setError(null);
    try {
      await fetch("/api/tunnel/stop", { method: "POST" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setToggling(false);
    }
  }

  function handleConnect() {
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    connect();
  }

  function copyUrl() {
    if (!tunnel?.url) return;
    navigator.clipboard.writeText(tunnel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isRunning = tunnel?.status === "running";
  const isStarting = tunnel?.status === "starting";
  const isError = tunnel?.status === "error";
  const isStopped = !tunnel || tunnel.status === "stopped";
  const authEnabled = hostAuth !== "false";
  const anyUserEnabled = allowAnyUser === "true";

  return (
    <>
      <TunnelConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {isRunning
                ? <PublicIcon color="success" />
                : <PublicOffIcon color="disabled" />}
              <Typography variant="h6">Tunnel</Typography>
            </Stack>
            <StatusBadge status={tunnel?.status ?? "stopped"} />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Expose your workspace to the internet via Cloudflare Tunnel.
            Share the URL with anyone who has your PIN.
          </Typography>

          {isRunning && tunnel?.url && (
            <ConnectedView
              url={tunnel.url}
              tunnelName={tunnelName}
              copied={copied}
              toggling={toggling}
              onCopy={copyUrl}
              onDisconnect={disconnect}
            />
          )}

          {isStarting && (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <CircularProgress size={32} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Establishing tunnel connection...
              </Typography>
            </Box>
          )}

          {isError && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Alert severity="error" icon={<ErrorIcon />}>
                Tunnel failed to start
              </Alert>
              <Button variant="outlined" onClick={handleConnect} disabled={toggling}>
                Retry
              </Button>
            </Stack>
          )}

          {isStopped && (
            <Button
              variant="contained"
              fullWidth
              startIcon={toggling ? <CircularProgress size={16} /> : <PublicIcon />}
              onClick={handleConnect}
              disabled={toggling}
              disableElevation
              sx={{ mb: 2 }}
            >
              {toggling ? "Connecting..." : "Connect Tunnel"}
            </Button>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <ConfigSection
            open={configOpen || isStopped}
            onToggle={() => setConfigOpen((v) => !v)}
            tunnelName={tunnelName}
            hostAuth={authEnabled}
            allowAnyUser={anyUserEnabled}
            tunnelEnabled={tunnelEnabled === "true"}
            disabled={isRunning || isStarting}
            onUpdate={onUpdate}
            onConfigurePin={() => setParams({ tab: "secrets", kind: "tunnel_pin" })}
          />
          <TunnelAllowlistSection />
          <TunnelSessionsSection />
        </CardContent>
      </Card>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: "success" | "info" | "error" | "default" }> = {
    running: { label: "Connected", color: "success" },
    starting: { label: "Connecting", color: "info" },
    error: { label: "Error", color: "error" },
    stopped: { label: "Disconnected", color: "default" },
  };
  const { label, color } = map[status] ?? map.stopped;
  return <Chip label={label} size="small" color={color} variant="outlined" sx={{ fontSize: 11 }} />;
}

function ConnectedView({ url, tunnelName, copied, toggling, onCopy, onDisconnect }: {
  url: string; tunnelName: string;
  copied: boolean; toggling: boolean; onCopy: () => void; onDisconnect: () => void;
}) {
  const shortUrl = url.replace(/^https?:\/\//, "");
  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <CheckCircleIcon color="success" fontSize="small" />
          <Typography variant="body2" fontFamily="monospace"
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {shortUrl}
          </Typography>
        </Stack>
        <Tooltip title={copied ? "Copied" : "Copy URL"}>
          <IconButton size="small" onClick={onCopy}><ContentCopyIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
      {tunnelName && (
        <Typography variant="caption" color="text.secondary">
          Named tunnel: {tunnelName}
        </Typography>
      )}
      <Button variant="outlined" color="error" onClick={onDisconnect} disabled={toggling}
        startIcon={toggling ? <CircularProgress size={16} /> : <PublicOffIcon />}>
        Disconnect
      </Button>
    </Stack>
  );
}

function ConfigSection({ open, onToggle, tunnelName, hostAuth, allowAnyUser, tunnelEnabled, disabled, onUpdate, onConfigurePin }: {
  open: boolean; onToggle: () => void; tunnelName: string;
  hostAuth: boolean; allowAnyUser: boolean; tunnelEnabled: boolean; disabled: boolean;
  onUpdate: (key: string, value: string) => void; onConfigurePin: () => void;
}) {
  return (
    <>
      <Button size="small" onClick={onToggle}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ textTransform: "none", color: "text.secondary", mb: open ? 1 : 0 }}>
        Configuration
      </Button>
      <Collapse in={open}>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={tunnelEnabled}
                onChange={(e) => onUpdate("tunnel_enabled", e.target.checked ? "true" : "false")}
              />
            }
            label={
              <Stack>
                <Typography variant="body2">Start on boot</Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatically connect tunnel when the engine starts
                </Typography>
              </Stack>
            }
          />

          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2">Access PIN:</Typography>
            <Link component="button" variant="body2" onClick={onConfigurePin}
              sx={{ cursor: "pointer" }}>
              Configure
            </Link>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack>
              <Typography variant="body2">Require host authorization</Typography>
              <Typography variant="caption" color="text.secondary">
                {hostAuth ? "Connections require your explicit approval" : "Anyone with the PIN gets immediate access"}
              </Typography>
            </Stack>
          </Stack>

          {!hostAuth && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Anyone with the PIN can access your workspace without approval.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={allowAnyUser}
                onChange={(e) => onUpdate("tunnel_allow_any_user", e.target.checked ? "true" : "false")}
              />
            }
            label={
              <Stack>
                <Typography variant="body2">Allow any authenticated user</Typography>
                <Typography variant="caption" color="text.secondary">
                  {allowAnyUser
                    ? "Any signed-in user can access this workspace via tunnel"
                    : "Only the workspace owner's account can access via tunnel"}
                </Typography>
              </Stack>
            }
          />

          <TextField size="small" label="Named tunnel (optional)"
            value={tunnelName}
            onChange={(e) => onUpdate("tunnel_name", e.target.value)}
            placeholder="Leave empty for quick tunnel"
            helperText="Run 'cloudflared tunnel login' for persistent URLs"
            disabled={disabled} />
        </Stack>
      </Collapse>
    </>
  );
}

function TunnelConfirmDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <WarningAmberIcon color="warning" />
        Connect Tunnel?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1 }}>
          This exposes your workspace to the public internet through a
          Cloudflare Tunnel. Anyone with the URL and your PIN can interact
          with your workspace.
        </DialogContentText>
        <DialogContentText fontWeight="bold">
          The tunnel resets each time the server restarts.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning">Connect</Button>
      </DialogActions>
    </Dialog>
  );
}
