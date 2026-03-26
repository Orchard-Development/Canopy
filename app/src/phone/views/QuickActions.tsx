import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useCommand } from "../../lib/remote-commands";

interface QuickAction {
  label: string;
  type: string;
  payload?: Record<string, unknown>;
}

const ACTIONS: QuickAction[] = [
  { label: "New Shell", type: "terminal:create", payload: { remoteAccess: true } },
  { label: "List Sessions", type: "terminal:list" },
  { label: "Profiler Scan", type: "profiler-scan" },
  { label: "Workspace Sync", type: "workspace-sync" },
];

export function QuickActionsView() {
  const { loading, execute } = useCommand();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        {ACTIONS.map((action) => (
          <Button
            key={action.type + action.label}
            variant="outlined"
            onClick={() => execute(action.type, action.payload)}
            disabled={loading}
            sx={{ py: 2, textTransform: "none" }}
          >
            {loading ? <CircularProgress size={20} /> : action.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
