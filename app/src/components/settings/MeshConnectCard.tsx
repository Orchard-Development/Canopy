import { useState } from "react";
import {
  Card, CardContent, Typography, Stack, Button,
  TextField, IconButton, Tooltip, Box, Alert,
  Snackbar, Collapse, Chip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { api } from "../../lib/api";

interface Props {
  nodeName: string;
  cookie: string;
  wgPublicKey?: string | null;
  wgListenPort?: number | null;
  tunnelRunning?: boolean;
  onConnected?: () => void;
}

export function MeshConnectCard({ nodeName, cookie, wgPublicKey, wgListenPort, tunnelRunning, onConnected }: Props) {
  const [connectInput, setConnectInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [snackSeverity, setSnackSeverity] = useState<"success" | "error">("success");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showLan, setShowLan] = useState(false);
  const [lanCopied, setLanCopied] = useState(false);

  const connectionString = nodeName && cookie
    ? btoa(JSON.stringify({
        node: nodeName,
        cookie,
        v: 2,
        ...(wgPublicKey && { wg_pubkey: wgPublicKey }),
        ...(wgListenPort && { wg_port: wgListenPort }),
      }))
    : "";

  async function handleGenerateInvite() {
    setGeneratingInvite(true);
    try {
      const result = await api.meshCreateInvite("operator");
      setInviteLink(result.link);
    } catch (err) {
      setSnackMessage(err instanceof Error ? err.message : "Failed to generate invite");
      setSnackSeverity("error");
      setSnackOpen(true);
    }
    setGeneratingInvite(false);
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  function handleCopyLan() {
    navigator.clipboard.writeText(connectionString);
    setLanCopied(true);
    setTimeout(() => setLanCopied(false), 2000);
  }

  async function handleConnect() {
    if (!connectInput.trim()) return;
    setConnecting(true);
    try {
      const result = await api.meshConnect(connectInput.trim());
      if (result.ok) {
        setSnackMessage(`Connected to ${result.node}`);
        setSnackSeverity("success");
        setConnectInput("");
        onConnected?.();
      } else {
        setSnackMessage((result as Record<string, unknown>).error as string ?? "Failed to connect");
        setSnackSeverity("error");
      }
    } catch (err) {
      setSnackMessage(err instanceof Error ? err.message : "Connection failed");
      setSnackSeverity("error");
    }
    setConnecting(false);
    setSnackOpen(true);
  }

  const isInviteLink = /^https?:\/\/.+\/mesh\/join\//.test(connectInput.trim());

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <LinkIcon color="primary" />
            <Typography variant="h6">Connect</Typography>
          </Stack>

          {/* Invite link generation (remote) */}
          <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <PersonAddIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={500}>
                Invite a Remote Machine
              </Typography>
              {!tunnelRunning && (
                <Chip label="Tunnel required" size="small" variant="outlined" color="warning" sx={{ fontSize: 10 }} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Generate a one-time link. The other machine pastes it to join your mesh.
            </Typography>

            {inviteLink ? (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{
                    bgcolor: "action.hover",
                    px: 1.5, py: 0.75, borderRadius: 1, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontSize: 11,
                  }}
                >
                  {inviteLink}
                </Typography>
                <Tooltip title={inviteCopied ? "Copied!" : "Copy invite link"}>
                  <IconButton size="small" onClick={handleCopyInvite}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button size="small" onClick={handleGenerateInvite} disabled={generatingInvite}>
                  New
                </Button>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                size="small"
                onClick={handleGenerateInvite}
                disabled={generatingInvite || !tunnelRunning}
                startIcon={<PersonAddIcon />}
              >
                {generatingInvite ? "Generating..." : "Generate Invite Link"}
              </Button>
            )}
          </Box>

          {/* Join / connect input */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
              Join a Mesh
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Paste an invite link, connection string, or node address.
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="https://…/mesh/join/… or node@host"
                value={connectInput}
                onChange={(e) => setConnectInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
                disabled={connecting}
              />
              <Button
                variant="contained"
                onClick={handleConnect}
                disabled={connecting || !connectInput.trim()}
                disableElevation
                sx={{ whiteSpace: "nowrap" }}
              >
                {connecting ? "Connecting..." : isInviteLink ? "Join" : "Connect"}
              </Button>
            </Stack>
          </Box>

          {/* LAN connection string (collapsible) */}
          <Button
            size="small"
            onClick={() => setShowLan(!showLan)}
            endIcon={showLan ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ textTransform: "none", color: "text.secondary", mt: 0.5 }}
          >
            LAN Connection String
          </Button>
          <Collapse in={showLan}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                For machines on the same network (no tunnel needed):
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{
                    bgcolor: "action.hover",
                    px: 1.5, py: 0.75, borderRadius: 1, flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontSize: 11,
                  }}
                >
                  {connectionString || "Loading..."}
                </Typography>
                <Tooltip title={lanCopied ? "Copied!" : "Copy"}>
                  <IconButton size="small" onClick={handleCopyLan}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackSeverity} onClose={() => setSnackOpen(false)} variant="filled">
          {snackMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
