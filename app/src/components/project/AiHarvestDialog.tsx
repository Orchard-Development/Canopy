import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  LinearProgress,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TerminalIcon from "@mui/icons-material/Terminal";
import BoltIcon from "@mui/icons-material/Bolt";
import { api } from "../../lib/api";

interface Props {
  projectId: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
  onHarvested: () => void;
}

export function AiHarvestDialog({ projectId, projectName, open, onClose, onHarvested }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"terminal" | "quick">("quick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll terminal session for completion
  useEffect(() => {
    if (!sessionId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/terminal/${sessionId}`);
        if (!res.ok) {
          // Session cleaned up = it exited and auto-finalized
          clearInterval(pollRef.current!);
          setSessionId(null);
          setDone(true);
          onHarvested();
          return;
        }
        const data = await res.json() as { exitCode?: number };
        if (data.exitCode !== undefined) {
          clearInterval(pollRef.current!);
          setSessionId(null);
          setDone(true);
          onHarvested();
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId]);

  async function handleHarvest() {
    setLoading(true);
    setError(null);
    setDone(false);
    setSessionId(null);
    try {
      const res = await api.harvestAi(projectId, {
        mode,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (res.mode === "quick") {
        setFileCount(res.fileCount ?? 0);
        setDone(true);
        onHarvested();
      } else if (res.sessionId) {
        setSessionId(res.sessionId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI harvest failed";
      setError(msg.includes("already exists") ? "A pack with that name already exists" : msg);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
    setDone(false);
    setError(null);
    setSessionId(null);
    setName("");
    setDescription("");
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeIcon color="primary" />
          <span>AI Harvest</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Analyze <strong>{projectName}</strong> and extract coding conventions,
            architecture patterns, and best practices into a seed pack.
          </Typography>

          {!done && !sessionId && (
            <>
              <TextField
                label="Pack name (optional)"
                size="small"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${projectName}-conventions`}
                disabled={loading}
              />

              <TextField
                label="Description (optional)"
                size="small"
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />

              <Stack spacing={0.5}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">Mode</Typography>
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={(_, v) => v && setMode(v)}
                  size="small"
                  fullWidth
                  disabled={loading}
                >
                  <ToggleButton value="quick">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <BoltIcon sx={{ fontSize: 16 }} />
                      <span>Quick</span>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="terminal">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <TerminalIcon sx={{ fontSize: 16 }} />
                      <span>Deep</span>
                    </Stack>
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="caption" color="text.secondary">
                  {mode === "quick"
                    ? "Samples key files and uses a single AI call. Fast (~10s)."
                    : "Spawns a Claude session to explore the full codebase. Thorough (~2-10 min)."}
                </Typography>
              </Stack>
            </>
          )}

          {loading && mode === "quick" && (
            <Stack spacing={1} alignItems="center">
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">Analyzing codebase...</Typography>
            </Stack>
          )}

          {sessionId && (
            <Stack spacing={1}>
              <Alert severity="info" icon={<TerminalIcon />}>
                Claude is analyzing the codebase. This will auto-complete and create the pack.
                <br />
                Check the Terminals tab to watch progress.
              </Alert>
              <LinearProgress />
            </Stack>
          )}

          {done && (
            <Alert severity="success">
              Seed pack created{fileCount > 0 ? ` with ${fileCount} files` : ""}.
              It will appear in the packs list below.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {done ? "Done" : sessionId ? "Close" : "Cancel"}
        </Button>
        {!done && !sessionId && (
          <Button
            variant="contained"
            onClick={handleHarvest}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
          >
            {loading ? "Analyzing..." : "Harvest"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
