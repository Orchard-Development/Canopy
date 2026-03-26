import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import { api } from "../../lib/api";

interface HarvestItem {
  path: string;
  name: string;
  size?: number;
  fileCount?: number;
}

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onHarvested: () => void;
}

export function HarvestDialog({ projectId, open, onClose, onHarvested }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<HarvestItem[]>([]);
  const [skills, setSkills] = useState<HarvestItem[]>([]);
  const [templates, setTemplates] = useState<HarvestItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    setError(null);
    api.getHarvestable(projectId)
      .then((res) => {
        setRules(res.rules);
        setSkills(res.skills);
        setTemplates(res.templates);
      })
      .catch(() => setError("Failed to load project content"))
      .finally(() => setFetching(false));
  }, [projectId, open]);

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function selectAll() {
    const all = [...rules, ...skills, ...templates].map((i) => i.path);
    setSelected(new Set(all));
  }

  async function handleHarvest() {
    if (!name.trim() || selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      await api.harvestSeedPack({
        name: name.trim(),
        description: description.trim(),
        projectId,
        paths: Array.from(selected),
      });
      onHarvested();
      onClose();
      setName("");
      setDescription("");
      setSelected(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Harvest failed";
      setError(msg.includes("already exists") ? "A pack with that name already exists" : msg);
    } finally {
      setLoading(false);
    }
  }

  const total = rules.length + skills.length + templates.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Harvest Seed Pack</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Pack name"
            size="small"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. team-conventions"
          />
          <TextField
            label="Description (optional)"
            size="small"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {fetching && <CircularProgress size={20} />}

          {!fetching && total === 0 && (
            <Typography variant="body2" color="text.secondary">
              No rules, skills, or templates found in this project.
            </Typography>
          )}

          {!fetching && total > 0 && (
            <>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {selected.size} of {total} selected
                </Typography>
                <Button size="small" onClick={selectAll}>Select all</Button>
                <Button size="small" onClick={() => setSelected(new Set())}>Clear</Button>
              </Stack>

              {rules.length > 0 && (
                <>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Rules ({rules.length})
                  </Typography>
                  {rules.map((r) => (
                    <FormControlLabel
                      key={r.path}
                      sx={{ ml: 0 }}
                      control={<Checkbox size="small" checked={selected.has(r.path)} onChange={() => toggle(r.path)} />}
                      label={<Typography variant="body2">{r.name}</Typography>}
                    />
                  ))}
                </>
              )}

              {skills.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Skills ({skills.length})
                  </Typography>
                  {skills.map((s) => (
                    <FormControlLabel
                      key={s.path}
                      sx={{ ml: 0 }}
                      control={<Checkbox size="small" checked={selected.has(s.path)} onChange={() => toggle(s.path)} />}
                      label={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="body2">{s.name}</Typography>
                          {(s.fileCount ?? 0) > 1 && <Chip label={`${s.fileCount} files`} size="small" variant="outlined" />}
                        </Stack>
                      }
                    />
                  ))}
                </>
              )}

              {templates.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Templates ({templates.length})
                  </Typography>
                  {templates.map((t) => (
                    <FormControlLabel
                      key={t.path}
                      sx={{ ml: 0 }}
                      control={<Checkbox size="small" checked={selected.has(t.path)} onChange={() => toggle(t.path)} />}
                      label={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="body2">{t.name}</Typography>
                          <Chip label={`${t.fileCount} files`} size="small" variant="outlined" />
                        </Stack>
                      }
                    />
                  ))}
                </>
              )}

              {selected.size > 100 && (
                <Typography variant="caption" color="warning.main">
                  Large pack ({selected.size} items). Consider splitting into smaller, focused packs.
                </Typography>
              )}
            </>
          )}

          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleHarvest}
          disabled={loading || !name.trim() || selected.size === 0}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          {loading ? "Harvesting..." : "Harvest"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
