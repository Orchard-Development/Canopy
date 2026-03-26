import { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  Button,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { MarkdownContent } from "../MarkdownContent";
import { api } from "../../lib/api";
import type { TaggedItem, IntelKind } from "./IntelFileList";

interface Props {
  projectId: string;
  item: TaggedItem;
  onDeleted: () => void;
  onUpdated: () => void;
}

const KIND_LABELS: Record<IntelKind, string> = {
  rule: "Rule",
  skill: "Skill",
  memory: "Memory",
};

export function IntelFileDetail({ projectId, item, onDeleted, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(item.content);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (item.kind === "rule") {
        await api.updateRule(projectId, item.name, draft);
      } else if (item.kind === "skill") {
        await api.updateSkill(projectId, item.name, draft);
      }
      setEditing(false);
      onUpdated();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${KIND_LABELS[item.kind].toLowerCase()} "${item.name}"?`)) return;
    try {
      if (item.kind === "rule") await api.deleteRule(projectId, item.name);
      else if (item.kind === "skill") await api.deleteSkill(projectId, item.name);
      else if (item.kind === "memory") await api.deleteMemory(projectId, item.name);
      onDeleted();
    } catch { /* ignore */ }
  }

  const canEdit = item.kind === "rule" || item.kind === "skill";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Chip label={KIND_LABELS[item.kind]} size="small" variant="outlined" />
        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {item.name}
        </Typography>
        {canEdit && !editing && (
          <Tooltip title="Edit">
            <IconButton size="small" onClick={startEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={handleDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {item.description && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 0.5 }}>
          {item.description}
        </Typography>
      )}

      {editing ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2, minHeight: 0 }}>
          <TextField
            multiline
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: "0.8rem" } } }}
            sx={{ flex: 1, "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start" } }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
            <Button
              size="small"
              startIcon={<CloseIcon />}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || draft === item.content}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: "auto", p: 2, minHeight: 0 }}>
          <MarkdownContent content={item.content} />
        </Box>
      )}
    </Box>
  );
}
