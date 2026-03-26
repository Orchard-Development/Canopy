import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Box,
  Select,
  MenuItem,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { api } from "../../lib/api";

type Role = "admin" | "operator" | "viewer";

interface Props {
  pending: string[];
  onAction: () => void;
}

export function MeshApprovalCard({ pending, onAction }: Props) {
  const [roles, setRoles] = useState<Record<string, Role>>({});

  if (pending.length === 0) return null;

  function getRole(node: string): Role {
    return roles[node] ?? "operator";
  }

  async function handleApprove(node: string) {
    await api.meshApprove(node, getRole(node));
    onAction();
  }

  async function handleDeny(node: string) {
    await api.meshDeny(node);
    onAction();
  }

  return (
    <Card sx={{ mb: 3, border: "1px solid", borderColor: "warning.main" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">Pending Connections</Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          These machines are requesting to join your mesh. Choose a role and approve.
        </Typography>
        <Stack spacing={1}>
          {pending.map((node) => (
            <Box
              key={node}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "action.hover",
                px: 1.5,
                py: 1,
                borderRadius: 1,
              }}
            >
              <Typography
                variant="body2"
                fontFamily="monospace"
                sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {node}
              </Typography>
              <Select
                size="small"
                value={getRole(node)}
                onChange={(e) => setRoles((prev) => ({ ...prev, [node]: e.target.value as Role }))}
                sx={{ minWidth: 110, fontSize: 13 }}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="operator">Operator</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
              <Button
                size="small"
                variant="contained"
                color="success"
                disableElevation
                onClick={() => handleApprove(node)}
              >
                Allow
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleDeny(node)}
              >
                Deny
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
