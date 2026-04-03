import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Tabs, Tab, CircularProgress,
  Typography, Box,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { api } from "../../lib/api";

interface FileEditDialogProps {
  open: boolean;
  packId: string;
  file: { path: string; content?: string; storage_key?: string } | null;
  initialTab?: "edit" | "ai";
  onClose: () => void;
  onSaved: (path: string, newContent: string) => void;
}

export function FileEditDialog({ open, packId, file, initialTab = "edit", onClose, onSaved }: FileEditDialogProps) {
  const [tab, setTab] = useState<"edit" | "ai">(initialTab);
  const [content, setContent] = useState("");
  const [instruction, setInstruction] = useState("");
  const [saving, setSaving] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    if (!file) return;
    setInstruction("");
    setRewriteError(null);
    setTab(initialTab);
    if (file.content !== undefined) {
      setContent(file.content);
      setContentLoading(false);
    } else {
      setContent("");
      setContentLoading(true);
      api.fetchFileContent(packId, file.path)
        .then((result) => {
          setContent(result.content);
        })
        .catch(() => {
          setContent("// Failed to load file content");
        })
        .finally(() => setContentLoading(false));
    }
  }, [file]);

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    try {
      await api.upsertSeedPackFile(packId, { path: file.path, content });
      onSaved(file.path, content);
      onClose();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleRewrite() {
    if (!file || !instruction.trim()) return;
    setRewriting(true);
    setRewriteError(null);
    try {
      const result = await api.rewriteSeedPackFile(packId, { path: file.path, instruction });
      setContent(result.file.content ?? "");
      setTab("edit");
    } catch (e) {
      setRewriteError(e instanceof Error ? e.message : "Rewrite failed");
    }
    setRewriting(false);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Typography variant="body2" fontFamily="monospace" color="text.secondary">{file?.path}</Typography>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Edit" value="edit" />
          <Tab label="AI Rewrite" value="ai" icon={<AutoFixHighIcon fontSize="small" />} iconPosition="start" />
        </Tabs>

        {tab === "edit" && (
          contentLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TextField
              fullWidth
              multiline
              minRows={16}
              maxRows={32}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 } } }}
            />
          )
        )}

        {tab === "ai" && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Describe how the file should be rewritten. The AI will see the current content and apply your instruction.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Instruction"
              placeholder="e.g., Make the rules more concise, add a testing section, rewrite in a friendlier tone..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={rewriting}
            />
            <Box>
              <Button
                variant="contained"
                startIcon={rewriting ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                onClick={handleRewrite}
                disabled={rewriting || !instruction.trim() || contentLoading}
              >
                {rewriting ? "Rewriting..." : "Rewrite with AI"}
              </Button>
            </Box>
            {rewriteError && (
              <Typography variant="body2" color="error">{rewriteError}</Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !content || contentLoading}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
