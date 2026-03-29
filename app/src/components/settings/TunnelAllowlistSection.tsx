import { useState, useEffect } from "react";
import {
  Box, Typography, Stack, TextField, Button, Select, MenuItem,
  IconButton, Chip, CircularProgress, Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { api, type TunnelEmail } from "../../lib/api";

const ROLES = ["operator", "viewer", "full"] as const;

function RoleChip({ role }: { role: string }) {
  const color = role === "full" ? "success" : role === "operator" ? "primary" : "default";
  return <Chip label={role} size="small" color={color as "success" | "primary" | "default"} />;
}

export function TunnelAllowlistSection() {
  const [emails, setEmails] = useState<TunnelEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("operator");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    api.listTunnelEmails()
      .then((r) => setEmails(r.emails))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.addTunnelEmail(newEmail.trim(), newRole);
      setNewEmail("");
      refresh();
    } catch {
      setError("Failed to add email");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(email: string) {
    try {
      await api.deleteTunnelEmail(email);
      setEmails((prev) => prev.filter((e) => e.email !== email));
    } catch {
      setError("Failed to remove email");
    }
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
        Email allowlist
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Users who enter their email at the tunnel gate get access without a PIN.
      </Typography>

      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          {emails.length === 0 && (
            <Typography variant="caption" color="text.secondary">No emails added yet.</Typography>
          )}
          {emails.map((e) => (
            <Stack key={e.email} direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: "monospace", fontSize: 13 }}>
                {e.email}
              </Typography>
              <RoleChip role={e.role} />
              <IconButton size="small" onClick={() => handleDelete(e.email)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      {error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="user@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          sx={{ flex: 1 }}
        />
        <Select
          size="small"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          sx={{ minWidth: 100 }}
        >
          {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </Select>
        <Button
          size="small"
          variant="outlined"
          startIcon={adding ? <CircularProgress size={14} /> : <AddIcon />}
          onClick={handleAdd}
          disabled={adding || !newEmail.trim()}
        >
          Add
        </Button>
      </Stack>
    </Box>
  );
}
