import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { api } from "../../lib/api";
import { useActiveProject } from "../../hooks/useActiveProject";
import { DirectoryPicker } from "../DirectoryPicker";

function isElectron(): boolean {
  return typeof window.orchard?.pickDirectory === "function";
}

export function ImportExistingTab() {
  const navigate = useNavigate();
  const { activate } = useActiveProject();
  const [rootPath, setRootPath] = useState("");
  const [name, setName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  async function handleBrowse() {
    if (isElectron()) {
      const dir = await window.orchard!.pickDirectory!();
      if (dir) setRootPath(dir);
    } else {
      setPickerOpen(true);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const project = await api.importProject(rootPath, name || undefined);
      activate(project);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import project");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <TextField
        label="Project folder"
        helperText="Select an existing project directory to import"
        value={rootPath}
        onChange={(e) => setRootPath(e.target.value)}
        fullWidth
        required
        autoFocus
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleBrowse} edge="end" aria-label="browse">
                  <FolderOpenIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        label="Project name (optional)"
        helperText="Defaults to the folder name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={() => navigate(-1)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={importing || !rootPath.trim()}
          startIcon={importing ? <CircularProgress size={16} /> : undefined}
        >
          {importing ? "Importing..." : "Import"}
        </Button>
      </Stack>

      <DirectoryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => setRootPath(p)}
        title="Select project folder"
      />
    </Stack>
  );
}
