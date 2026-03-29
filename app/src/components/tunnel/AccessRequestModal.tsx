import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import type { AccessRequest } from "@/hooks/useAccessRequests";

interface Props {
  requests: AccessRequest[];
  open: boolean;
  onClose: () => void;
  onDismiss: (email: string) => void;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function AccessRequestModal({ requests, open, onClose, onDismiss }: Props) {
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
          <LockPersonIcon sx={{ fontSize: 32, color: "warning.main" }} />
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Access Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {requests.length} pending request{requests.length !== 1 ? "s" : ""} for this node
            </Typography>
          </Box>
        </Box>

        {requests.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No pending requests
          </Typography>
        ) : (
          <List disablePadding>
            {requests.map((req, i) => (
              <Box key={req.email + req.timestamp}>
                {i > 0 && <Divider />}
                <ListItem
                  disableGutters
                  secondaryAction={
                    <Button size="small" onClick={() => onDismiss(req.email)}>
                      Dismiss
                    </Button>
                  }
                >
                  <ListItemText
                    primary={req.email}
                    secondary={timeAgo(req.timestamp)}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 1 }}>
          To grant access, update the auth policy in Settings or add the email to the allowlist.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
