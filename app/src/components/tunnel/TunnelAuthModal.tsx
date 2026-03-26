import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import type { TunnelConnection } from "@/lib/api";

interface Props {
  connections: TunnelConnection[];
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function parseUserAgent(ua: string): string {
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 40);
}

export function TunnelAuthModal({ connections, open, onClose, onApprove, onDeny }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(4px)" } } }}
    >
      <DialogContent sx={{ p: 3, pb: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <VpnKeyIcon sx={{ fontSize: 32, color: "error.main" }} />
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Tunnel Connections
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {connections.length} pending authorization{connections.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>

        {connections.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No pending connections
          </Typography>
        ) : (
          <List disablePadding>
            {connections.map((conn, i) => (
              <Box key={conn.id}>
                {i > 0 && <Divider />}
                <ListItem
                  disableGutters
                  secondaryAction={
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        color="success"
                        onClick={() => onApprove(conn.id)}
                        title="Approve"
                        size="small"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => onDeny(conn.id)}
                        title="Deny"
                        size="small"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={conn.ip}
                    secondary={`${parseUserAgent(conn.userAgent)} -- ${timeAgo(conn.createdAt)}`}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
