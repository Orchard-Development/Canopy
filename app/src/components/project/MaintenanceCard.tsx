import { useState } from "react";
import {
  Stack,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import { api } from "../../lib/api";

interface Props {
  projectId: string;
}

export function MaintenanceCard({ projectId }: Props) {
  const [reseeding, setReseeding] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleReseed() {
    setReseeding(true);
    setResult(null);
    try {
      const res = await api.reseedConfig(projectId);
      if (res.ok) {
        setResult({
          type: "success",
          message: `Config reseeded: ${res.written} written, ${res.removed} removed`,
        });
      } else {
        setResult({ type: "error", message: res.error ?? "Reseed failed" });
      }
    } catch (err) {
      setResult({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
    setReseeding(false);
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Regenerate derived config files (CLAUDE.md, .cursor/rules, hooks, etc.) from canonical sources.
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          size="small"
          startIcon={reseeding ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
          onClick={handleReseed}
          disabled={reseeding}
        >
          {reseeding ? "Reseeding..." : "Reseed Config"}
        </Button>
      </Stack>

      {result && (
        <Alert severity={result.type} sx={{ mt: 1 }}>
          {result.message}
        </Alert>
      )}
    </Stack>
  );
}
