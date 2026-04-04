import { useState } from "react";
import {
  Card, CardContent, Typography, Stack, Button,
  Box, Chip, Divider, Select, MenuItem,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { api, type MeshNode } from "../../lib/api";

type Role = "admin" | "operator" | "viewer";

interface Props {
  peers: MeshNode[];
  onDisconnect: (node: string) => void;
  onRoleChange?: (node: string, role: Role) => void;
}

function NodeRow({ peer, onDisconnect, onRoleChange }: {
  peer: MeshNode;
  onDisconnect: (node: string) => void;
  onRoleChange?: (node: string, role: Role) => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [role, setRole] = useState<Role>((peer.role as Role) ?? "operator");
  const [saving, setSaving] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.meshDisconnect(peer.name);
      onDisconnect(peer.name);
    } catch {
      // ignore
    }
    setDisconnecting(false);
  }

  async function handleRoleChange(newRole: Role) {
    setRole(newRole);
    setSaving(true);
    try {
      await api.meshUpdateRole(peer.name, newRole);
      onRoleChange?.(peer.name, newRole);
    } catch {
      setRole(role); // revert on failure
    }
    setSaving(false);
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 1,
        gap: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {peer.display_name
              ? `${peer.display_name}${peer.machine_name ? ` (${peer.machine_name})` : ""}`
              : peer.name}
          </Typography>
          {peer.display_name && (
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily="monospace"
              sx={{ fontSize: 11 }}
            >
              {peer.name}
            </Typography>
          )}
        </Box>
        <Chip
          label={`${peer.sessions} session${peer.sessions === 1 ? "" : "s"}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: 11, height: 20 }}
        />
      </Stack>
      <Select
        size="small"
        value={role}
        onChange={(e) => handleRoleChange(e.target.value as Role)}
        disabled={saving}
        sx={{ minWidth: 110, fontSize: 13 }}
      >
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="operator">Operator</MenuItem>
        <MenuItem value="viewer">Viewer</MenuItem>
      </Select>
      <Button
        size="small"
        color="error"
        variant="outlined"
        startIcon={<LinkOffIcon />}
        onClick={handleDisconnect}
        disabled={disconnecting}
        sx={{ whiteSpace: "nowrap" }}
      >
        {disconnecting ? "..." : "Disconnect"}
      </Button>
    </Box>
  );
}

export function MeshNodesCard({ peers, onDisconnect, onRoleChange }: Props) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <DevicesIcon color="primary" />
          <Typography variant="h6">Connected Nodes</Typography>
          {peers.length > 0 && (
            <Chip
              label={peers.length}
              size="small"
              color="success"
              sx={{ fontSize: 11, height: 20, minWidth: 24 }}
            />
          )}
        </Stack>

        {peers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No connected nodes. Use the connection tools above to link another machine.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {peers.map((peer) => (
              <NodeRow
                key={peer.name}
                peer={peer}
                onDisconnect={onDisconnect}
                onRoleChange={onRoleChange}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
