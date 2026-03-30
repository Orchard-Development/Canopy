import { useState, useEffect, useRef } from "react";
import {
  Card, CardContent, Typography, Stack, Button,
  IconButton, Tooltip, Box, CircularProgress,
  Snackbar, Alert, Chip, TextField,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import HubIcon from "@mui/icons-material/Hub";
import ShareIcon from "@mui/icons-material/Share";
import { api, type TunnelStatus } from "../../lib/api";

interface Props {
  nodeName: string;
  cookie: string;
  onCookieChange: (cookie: string) => void;
}

function generateCookie(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function MeshCard({ nodeName, cookie, onCookieChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus | null>(null);
  const [wgKeyCopied, setWgKeyCopied] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareSecondsLeft, setShareSecondsLeft] = useState(0);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const shareTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.meshTunnel().then(setTunnelStatus).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearInterval(shareTimerRef.current);
    };
  }, []);

  async function handleShareLink() {
    setSharingLink(true);
    try {
      const { url, expires_at } = await api.tunnelCreateShare();
      setShareUrl(url);
      const expiresMs = new Date(expires_at).getTime();
      const updateCountdown = () => {
        const left = Math.max(0, Math.round((expiresMs - Date.now()) / 1000));
        setShareSecondsLeft(left);
        if (left === 0) {
          if (shareTimerRef.current) clearInterval(shareTimerRef.current);
          setShareUrl(null);
        }
      };
      updateCountdown();
      shareTimerRef.current = setInterval(updateCountdown, 1000);
    } catch {
      setSnackMessage("Failed to create share link. Is the tunnel running?");
      setSnackOpen(true);
    }
    setSharingLink(false);
  }

  function handleCopyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  }

  const shareMinutes = Math.floor(shareSecondsLeft / 60);
  const shareSeconds = shareSecondsLeft % 60;

  function handleCopy() {
    if (!cookie) return;
    navigator.clipboard.writeText(cookie);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const newCookie = generateCookie();
      await api.meshUpdateCookie(newCookie);
      onCookieChange(newCookie);
    } catch {
      // ignore
    }
    setRegenerating(false);
  }

  const maskedCookie = cookie ? "\u2022".repeat(Math.min(cookie.length, 20)) : "---";

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <HubIcon color="primary" />
            <Typography variant="h6">This Machine</Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your node identity on the distributed mesh.
          </Typography>

          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                Node Name
              </Typography>
              <Typography
                variant="body2"
                fontFamily="monospace"
                sx={{ bgcolor: "action.hover", px: 1.5, py: 0.75, borderRadius: 1 }}
              >
                {nodeName || "Loading..."}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                Cookie
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{
                    bgcolor: "action.hover",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {visible ? cookie : maskedCookie}
                </Typography>
                <Tooltip title={visible ? "Hide" : "Show"}>
                  <IconButton size="small" onClick={() => setVisible((v) => !v)}>
                    {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={copied ? "Copied" : "Copy"}>
                  <IconButton size="small" onClick={handleCopy}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Regenerate">
                  <IconButton size="small" onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating
                      ? <CircularProgress size={16} />
                      : <RefreshIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {tunnelStatus && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    WireGuard Tunnel
                  </Typography>
                  {tunnelStatus.status === "ready" && (
                    <Chip label="Active" size="small" color="success" />
                  )}
                  {tunnelStatus.status === "disabled" && (
                    <Chip label="Not available" size="small" />
                  )}
                  {tunnelStatus.status === "crashed" && (
                    <Chip label="Error" size="small" color="error" />
                  )}
                  {tunnelStatus.status === "starting" && (
                    <Chip label="Starting" size="small" color="warning" />
                  )}
                </Stack>

                {tunnelStatus.status === "ready" && tunnelStatus.public_key && (
                  <Stack spacing={0.5}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Public Key:
                      </Typography>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{
                          bgcolor: "action.hover",
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 200,
                        }}
                      >
                        {tunnelStatus.public_key}
                      </Typography>
                      <Tooltip title={wgKeyCopied ? "Copied" : "Copy"}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (tunnelStatus.public_key) {
                              navigator.clipboard.writeText(tunnelStatus.public_key);
                              setWgKeyCopied(true);
                              setTimeout(() => setWgKeyCopied(false), 2000);
                            }
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    {tunnelStatus.listen_port && (
                      <Typography variant="body2" color="text.secondary">
                        Listen Port: {tunnelStatus.listen_port}
                      </Typography>
                    )}
                  </Stack>
                )}

                {tunnelStatus.status === "disabled" && (
                  <Typography variant="body2" color="text.secondary">
                    ctx-wireguard binary not found. Build with: cargo build --release
                  </Typography>
                )}

                {tunnelStatus.status === "crashed" && (
                  <Typography variant="body2" color="text.secondary">
                    Tunnel process crashed. Check engine logs.
                  </Typography>
                )}
              </Box>
            )}


            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Share Link
                </Typography>
                {shareUrl && shareSecondsLeft > 0 && (
                  <Typography variant="caption" color="warning.main">
                    Expires in {shareMinutes}:{String(shareSeconds).padStart(2, "0")}
                  </Typography>
                )}
              </Stack>

              {shareUrl && shareSecondsLeft > 0 ? (
                <Stack spacing={1}>
                  <Alert severity="warning" sx={{ py: 0.5 }}>
                    This link grants full operator access. Single-use. Share privately.
                  </Alert>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <TextField
                      value={shareUrl}
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 12 } }}
                    />
                    <Tooltip title={shareLinkCopied ? "Copied" : "Copy"}>
                      <IconButton size="small" onClick={handleCopyShareLink}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              ) : shareSecondsLeft === 0 && !shareUrl ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={sharingLink ? <CircularProgress size={14} /> : <ShareIcon fontSize="small" />}
                  onClick={handleShareLink}
                  disabled={sharingLink}
                >
                  {sharingLink ? "Generating..." : "Generate Share Link"}
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Link expired.{" "}
                  <Button size="small" onClick={handleShareLink} disabled={sharingLink}>
                    Generate new
                  </Button>
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          onClose={() => setSnackOpen(false)}
          variant="filled"
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
