import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, CircularProgress, Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { api } from "../../lib/api";

type ContentType = "rule" | "skill" | "file";

interface AddContentDialogProps {
  open: boolean;
  type: ContentType;
  packId: string;
  onClose: () => void;
  onCreated: (file: { path: string; content?: string; sha256: string; storage_key?: string }) => void;
}

const TYPE_LABELS: Record<ContentType, string> = { rule: "Rule", skill: "Skill", file: "File" };
const PLACEHOLDERS: Record<ContentType, string> = {
  rule: "e.g., Enforce test coverage for all new modules...",
  skill: "e.g., A skill for auditing API endpoints for security issues...",
  file: "e.g., A template for project READMEs...",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AddContentDialog({ open, type, packId, onClose, onCreated }: AddContentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setName(""); setDescription(""); setContent(""); setGenerated(false); setError(null); }
  }, [open, type]);

  const label = TYPE_LABELS[type];
  const slug = slugify(name);
  const pathPreview = type === "rule" ? `rules/${slug}.md` : type === "skill" ? `skills/${slug}/SKILL.md` : slug;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateSeedPackFile(packId, { type, name, description });
      setContent(result.content);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    }
    setGenerating(false);
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const path = type === "rule" ? `rules/${slug}.md` : type === "skill" ? `skills/${slug}/SKILL.md` : name;
      const result = await api.upsertSeedPackFile(packId, { path, content });
      onCreated(result.file);
      onClose();
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add {label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={type === "file" ? "File path" : "Name"}
            size="small"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "file" ? "rules/my-file.md" : undefined}
          />

          <TextField
            label={`What should this ${label.toLowerCase()} do?`}
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={PLACEHOLDERS[type]}
          />

          {name.trim() && type !== "file" && (
            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
              Path: {pathPreview}
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
              onClick={handleGenerate}
              disabled={generating || !name.trim()}
            >
              {generating ? "Generating..." : `Generate with AI`}
            </Button>
          </Stack>

          {error && <Typography variant="body2" color="error">{error}</Typography>}

          {generated && (
            <TextField
              fullWidth
              multiline
              minRows={14}
              maxRows={28}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 } } }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? "Saving..." : "Save to Pack"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
