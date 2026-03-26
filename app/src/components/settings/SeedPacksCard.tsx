import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
} from "@mui/material";
import GrassIcon from "@mui/icons-material/Grass";
import GitHubIcon from "@mui/icons-material/GitHub";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import { api } from "../../lib/api";
import { GitHubHarvestDialog } from "./GitHubHarvestDialog";

interface SeedPack {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_project_id: string | null;
  fileCount: number;
  version: number;
  source?: "shipped" | "user";
  created_at: string;
  updated_at: string;
}

function FileList({ packId }: { packId: string }) {
  const [files, setFiles] = useState<Array<{ path: string }> | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setOpen(true);
    try {
      const res = await fetch(`/api/seed-packs/${packId}`);
      const data = await res.json() as { files: Array<{ path: string; content: string }> };
      setFiles(data.files);
    } catch { setFiles([]); }
  }

  return (
    <>
      <Tooltip title="View files">
        <IconButton size="small" onClick={load}>
          <DescriptionIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pack Files</DialogTitle>
        <DialogContent>
          {!files && <CircularProgress size={20} />}
          {files && files.length === 0 && <Typography variant="body2">No files</Typography>}
          {files && files.length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {files.map((f) => (
                <Typography key={f.path} variant="body2" fontFamily="monospace" sx={{ fontSize: 12 }}>
                  {f.path}
                </Typography>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
}

function EditDialog({ pack, open, onClose, onSaved }: {
  pack: SeedPack;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(pack.name); setDescription(pack.description); }, [pack]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/seed-packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      onSaved();
      onClose();
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Seed Pack</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Description" size="small" fullWidth multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function SeedPacksCard() {
  const [packs, setPacks] = useState<SeedPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SeedPack | null>(null);
  const [githubOpen, setGithubOpen] = useState(false);

  function load() {
    setLoading(true);
    api.listSeedPacks()
      .then(setPacks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    try {
      await api.deleteSeedPack(id);
      setPacks((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <GrassIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>Seed Packs</Typography>
          <Chip label={`${packs.length} packs`} size="small" variant="outlined" sx={{ ml: "auto !important" }} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<GitHubIcon />}
            onClick={() => setGithubOpen(true)}
          >
            Harvest from GitHub
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Shipped packs come with the platform. Custom packs are harvested from projects
          and can be planted on any orchard.
        </Typography>

        {loading && <CircularProgress size={20} />}

        {!loading && packs.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No seed packs found.
          </Typography>
        )}

        {!loading && packs.length > 0 && (
          <Stack spacing={1.5}>
            {packs.map((pack) => {
              const isShipped = pack.source === "shipped";
              return (
              <Box key={pack.id} sx={{ p: 1.5, border: 1, borderColor: isShipped ? "primary.main" : "divider", borderRadius: 1, bgcolor: isShipped ? "action.hover" : undefined }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{pack.name}</Typography>
                  <Chip label={`v${pack.version}`} size="small" variant="outlined" />
                  <Chip label={`${pack.fileCount} files`} size="small" variant="outlined" />
                  {isShipped && <Chip label="shipped" size="small" color="primary" variant="outlined" />}
                  {!isShipped && <Chip label="custom" size="small" variant="outlined" />}
                  <Stack direction="row" spacing={0} sx={{ ml: "auto !important" }}>
                    {!isShipped && <FileList packId={pack.id} />}
                    {!isShipped && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setEditing(pack)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!isShipped && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(pack.id)} color="error">
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
                {pack.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {pack.description}
                  </Typography>
                )}
                {!isShipped && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.25 }}>
                    Updated {new Date(pack.updated_at).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
              );
            })}
          </Stack>
        )}

        {editing && (
          <EditDialog
            pack={editing}
            open={true}
            onClose={() => setEditing(null)}
            onSaved={load}
          />
        )}

        <GitHubHarvestDialog
          open={githubOpen}
          onClose={() => setGithubOpen(false)}
          onHarvested={load}
        />
      </CardContent>
    </Card>
  );
}
