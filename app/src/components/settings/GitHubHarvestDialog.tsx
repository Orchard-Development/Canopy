import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  LinearProgress,
  Alert,
  Chip,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";

interface HarvestResult {
  id: string;
  name: string;
  slug: string;
  fileCount: number;
  scannedFiles: number;
  source: string;
  tokens: { input: number; output: number };
}

export function GitHubHarvestDialog({
  open,
  onClose,
  onHarvested,
}: {
  open: boolean;
  onClose: () => void;
  onHarvested: () => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [harvesting, setHarvesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HarvestResult | null>(null);

  async function handleHarvest() {
    setHarvesting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/seed-packs/harvest-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          name: name.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
      } else {
        setResult(data as HarvestResult);
        onHarvested();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }

    setHarvesting(false);
  }

  function handleClose() {
    if (harvesting) return;
    setUrl("");
    setName("");
    setDescription("");
    setError(null);
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <GitHubIcon />
        Harvest from GitHub
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Clone a GitHub repo, scan for agent config (CLAUDE.md, rules, skills,
            .cursorrules, etc.), and use AI to extract a reusable seed pack.
          </Typography>

          <TextField
            label="GitHub URL"
            placeholder="https://github.com/owner/repo or owner/repo"
            size="small"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={harvesting}
            autoFocus
          />
          <TextField
            label="Pack name (optional)"
            placeholder="Auto-generated from repo name"
            size="small"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={harvesting}
          />
          <TextField
            label="Description (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={harvesting}
          />

          {harvesting && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Cloning repo, scanning files, analyzing with AI...
              </Typography>
              <LinearProgress />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Alert severity="success">
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                Created "{result.name}"
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`${result.fileCount} files`} size="small" variant="outlined" />
                <Chip label={`${result.scannedFiles} scanned`} size="small" variant="outlined" />
                <Chip label={result.source} size="small" variant="outlined" />
              </Stack>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={harvesting}>
          {result ? "Done" : "Cancel"}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={handleHarvest}
            disabled={harvesting || !url.trim()}
          >
            {harvesting ? "Harvesting..." : "Harvest"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
