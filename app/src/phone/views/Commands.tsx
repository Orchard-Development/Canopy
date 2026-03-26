import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
} from "@mui/material";
import { useCommand } from "../../lib/remote-commands";

const COMMAND_TYPES = [
  { type: "terminal:list", label: "List Terminals", description: "Show all active terminal sessions" },
  { type: "terminal:create", label: "Create Terminal", description: "Spawn a new terminal session" },
  { type: "profiler-scan", label: "Profiler Scan", description: "Run a workspace profiler scan" },
  { type: "workspace-sync", label: "Workspace Sync", description: "Trigger workspace synchronization" },
];

export function CommandsView() {
  const { loading, result, error, execute } = useCommand();
  const [customType, setCustomType] = useState("");
  const [customPayload, setCustomPayload] = useState("");

  const handleCustom = () => {
    if (!customType) return;
    let payload = {};
    try {
      payload = customPayload ? JSON.parse(customPayload) : {};
    } catch { /* use empty */ }
    execute(customType, payload);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Command Palette</Typography>

      <List sx={{ mb: 2 }}>
        {COMMAND_TYPES.map((cmd) => (
          <ListItem
            key={cmd.type}
            secondaryAction={
              <Button
                size="small"
                variant="outlined"
                disabled={loading}
                onClick={() => execute(cmd.type)}
              >
                Run
              </Button>
            }
          >
            <ListItemText primary={cmd.label} secondary={cmd.description} />
          </ListItem>
        ))}
      </List>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Custom Command</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label="Command type"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          placeholder="e.g. terminal:list"
        />
        <TextField
          size="small"
          label="Payload (JSON)"
          value={customPayload}
          onChange={(e) => setCustomPayload(e.target.value)}
          placeholder='{"key": "value"}'
          multiline
          rows={2}
        />
        <Button variant="contained" size="small" onClick={handleCustom} disabled={loading || !customType}>
          Send
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {result !== null && (
        <Box sx={{ p: 1, bgcolor: "background.default", borderRadius: 1, overflow: "auto" }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}>
            {JSON.stringify(result, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
