import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  IconButton,
  InputAdornment,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { api, type ProjectRecord } from "../../lib/api";
import { useActiveProject } from "../../hooks/useActiveProject";
import { DirectoryPicker } from "../DirectoryPicker";

interface Props {
  project: ProjectRecord;
  onUpdate: () => void;
}

export function GeneralCard({ project, onUpdate }: Props) {
  const navigate = useNavigate();
  const { activate, clear } = useActiveProject();
  const config = typeof project.config === "string" ? JSON.parse(project.config || "{}") : (project.config ?? {});
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [rootPath, setRootPath] = useState(project.root_path);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const dirty =
    name.trim() !== project.name ||
    description.trim() !== project.description ||
    rootPath.trim() !== project.root_path;

  async function handleBrowse() {
    const w = window as unknown as Record<string, unknown>;
    if (typeof w.ctx === "object" && typeof (w.ctx as Record<string, unknown>)?.pickDirectory === "function") {
      const ctx = w.ctx as { pickDirectory: () => Promise<string | null> };
      const dir = await ctx.pickDirectory();
      if (dir) setRootPath(dir);
    } else {
      setPickerOpen(true);
    }
  }

  async function handleSave() {
    if (!dirty || !name.trim()) return;
    setSaving(true);
    try {
      await api.updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        root_path: rootPath.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdate();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function navigateAfterDelete() {
    const remaining = await api.listProjects();
    const next = remaining.filter((p) => p.id !== project.id)[0];
    if (next) {
      activate(next);
      navigate(`/projects/${next.id}`, { replace: true });
    } else {
      clear();
      navigate("/projects/new", { replace: true });
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.name}"? This will archive the project.`)) return;
    setDeleting(true);
    try {
      await api.deleteProject(project.id);
      await navigateAfterDelete();
    } catch { /* ignore */ }
    setDeleting(false);
  }

  async function handleDeleteWithData() {
    if (
      !window.confirm(
        `Delete "${project.name}" AND permanently remove all files at:\n\n${project.root_path}\n\nThis cannot be undone.`
      )
    ) return;
    setDeleting(true);
    try {
      await api.deleteProjectWithData(project.id);
      await navigateAfterDelete();
    } catch { /* ignore */ }
    setDeleting(false);
  }

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Project Details
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Name"
              size="small"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Description"
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Base Directory"
              size="small"
              fullWidth
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="/path/to/project"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleBrowse} edge="end" size="small">
                      <FolderOpenIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              inputProps={{ style: { fontFamily: "monospace" } }}
            />
            {config.projectType && (
              <Typography variant="body2" color="text.secondary">
                Type: {config.projectType}
              </Typography>
            )}
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={!dirty || saving || !name.trim()}
              sx={{ alignSelf: "flex-start" }}
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} color="error" sx={{ mb: 1 }}>
            Danger Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Archiving a project removes it from your workspace. The files on disk are not deleted.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Project"}
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleDeleteWithData}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Project and Data"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <DirectoryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => setRootPath(p)}
        title="Choose project directory"
      />
    </Stack>
  );
}
