import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, Chip, Button, CircularProgress,
  Collapse, IconButton, Tooltip, Paper, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GrassIcon from "@mui/icons-material/Grass";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { PageLayout } from "../components/PageLayout";
import { FileEditDialog } from "../components/seedpacks/FileEditDialog";
import { AddContentDialog } from "../components/seedpacks/AddContentDialog";
import { api } from "../lib/api";

type AddType = "rule" | "skill" | "file";

interface PackFile { path: string; content?: string; sha256: string; storage_key?: string }
interface PackData {
  id: string; name: string; slug: string; description: string;
  source: string; files: PackFile[]; version: number;
  created_at: string; updated_at: string;
  category?: string; tags?: string[]; requires?: string[];
  techStack?: string[];
  pack_type?: "orchard" | "community";
  auto_apply?: boolean;
}

export default function SeedPackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pack, setPack] = useState<PackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [metaOpen, setMetaOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editingFile, setEditingFile] = useState<PackFile | null>(null);
  const [editTab, setEditTab] = useState<"edit" | "ai">("edit");
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<AddType>("rule");
  const [allPacks, setAllPacks] = useState<Array<{ id: string; slug: string }>>([]);
  const [fileContentCache, setFileContentCache] = useState<Record<string, string>>({});
  const [fileContentLoading, setFileContentLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getSeedPack(id)
      .then((data) => { setPack(data); setEditName(data.name); setEditDesc(data.description); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.listSeedPacks()
      .then((list) => setAllPacks(list.map((p) => ({ id: p.id, slug: p.slug }))))
      .catch(() => {});
  }, [id]);

  async function fetchContent(path: string) {
    if (!pack || fileContentCache[path] !== undefined) return;
    setFileContentLoading((prev) => new Set([...prev, path]));
    try {
      const result = await api.fetchFileContent(pack.id, path);
      setFileContentCache((prev) => ({ ...prev, [path]: result.content }));
    } catch { /* ignore -- user sees no content */ }
    setFileContentLoading((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }

  function resolveContent(file: PackFile): string | undefined {
    return file.content ?? fileContentCache[file.path];
  }

  function toggleFile(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        const file = pack?.files.find((f) => f.path === path);
        if (file && !file.content && fileContentCache[path] === undefined) {
          fetchContent(path);
        }
      }
      return next;
    });
  }

  async function handleSaveMetadata() {
    if (!pack) return;
    try {
      await api.updateSeedPack(pack.id, { name: editName, description: editDesc });
      setPack((p) => p ? { ...p, name: editName, description: editDesc } : p);
      setMetaOpen(false);
    } catch { /* ignore */ }
  }

  function handleFileSaved(path: string, newContent: string) {
    setPack((p) => {
      if (!p) return p;
      const files = p.files.map((f) => f.path === path ? { ...f, content: newContent } : f);
      return { ...p, files };
    });
    setFileContentCache((prev) => ({ ...prev, [path]: newContent }));
  }

  async function handleDeleteFile(path: string) {
    if (!pack) return;
    try {
      await api.removeSeedPackFile(pack.id, path);
      setPack((p) => p ? { ...p, files: p.files.filter((f) => f.path !== path) } : p);
    } catch { /* ignore */ }
  }

  function openAdd(type: AddType) { setAddType(type); setAddOpen(true); }

  function handleFileCreated(file: { path: string; content?: string; sha256: string; storage_key?: string }) {
    setPack((p) => p ? { ...p, files: [...p.files, file] } : p);
    setExpanded((prev) => new Set([...prev, file.path]));
    if (file.content) {
      setFileContentCache((prev) => ({ ...prev, [file.path]: file.content! }));
    }
  }

  if (loading) return <CircularProgress size={24} sx={{ mt: 4 }} />;
  if (error || !pack) return (
    <Box sx={{ mt: 4 }}>
      <Typography color="error">{error || "Pack not found"}</Typography>
      <Button onClick={() => navigate("/seed-packs")} sx={{ mt: 1 }}>Back</Button>
    </Box>
  );

  const grouped = groupByDir(pack.files);

  return (
    <PageLayout
      title={pack.name}
      icon={<GrassIcon color="primary" />}
      badge={
        <Stack direction="row" spacing={0.5}>
          <Chip label={`v${pack.version}`} size="small" variant="outlined" />
          <Chip label={pack.source} size="small" color={pack.source === "public" ? "primary" : "default"} variant="outlined" />
          <Chip label={`${pack.files.length} files`} size="small" variant="outlined" />
          {pack.category && (
            <Chip label={pack.category} size="small" color="primary" variant="outlined" />
          )}
          {pack.pack_type === "orchard" && (
            <Chip icon={<AccountTreeIcon />} label="Orchard" size="small" color="secondary" variant="outlined" />
          )}
        </Stack>
      }
      actions={
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => navigate("/seed-packs")} startIcon={<ArrowBackIcon />}>All Packs</Button>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setMetaOpen(true)}>Edit</Button>
        </Stack>
      }
    >
      {pack.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{pack.description}</Typography>
      )}

      {(pack.tags || []).length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: "wrap" }}>
          {pack.tags!.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>
      )}

      {(pack.techStack || []).length > 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Tech:</Typography>
          {pack.techStack!.map((tech) => (
            <Chip key={tech} label={tech} size="small" color="secondary" variant="outlined" />
          ))}
        </Stack>
      )}

      {(pack.requires || []).length > 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Requires:</Typography>
          {pack.requires!.map((req) => (
            <Chip
              key={req}
              label={req}
              size="small"
              color="info"
              variant="outlined"
              clickable
              onClick={() => {
                const target = allPacks.find((p) => p.slug === req);
                if (target) navigate(`/seed-packs/${target.id}`);
              }}
            />
          ))}
        </Stack>
      )}

      <Divider sx={{ mb: 2 }} />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>Files</Typography>
        <Button size="small" onClick={() => {
          setExpanded(new Set(pack.files.map((f) => f.path)));
          pack.files.forEach((f) => {
            if (!f.content && fileContentCache[f.path] === undefined) {
              fetchContent(f.path);
            }
          });
        }}>Expand All</Button>
        <Button size="small" onClick={() => setExpanded(new Set())}>Collapse All</Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openAdd("rule")}>Rule</Button>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openAdd("skill")}>Skill</Button>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openAdd("file")}>File</Button>
      </Stack>

      <Stack spacing={0.5}>
        {Object.entries(grouped).map(([dir, files]) => (
          <Box key={dir}>
            {dir && <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ display: "block", mt: 1, mb: 0.5 }}>{dir}/</Typography>}
            {files.map((file) => (
              <FileEntry
                key={file.path}
                file={file}
                expanded={expanded.has(file.path)}
                resolvedContent={resolveContent(file)}
                loading={fileContentLoading.has(file.path)}
                onToggle={() => toggleFile(file.path)}
                onEdit={() => { setEditTab("edit"); setEditingFile(file); }}
                onRewrite={() => { setEditTab("ai"); setEditingFile(file); }}
                onDelete={() => handleDeleteFile(file.path)}
              />
            ))}
          </Box>
        ))}
      </Stack>

      <FileEditDialog
        open={!!editingFile}
        packId={pack.id}
        file={editingFile}
        initialTab={editTab}
        onClose={() => setEditingFile(null)}
        onSaved={handleFileSaved}
      />

      <Dialog open={metaOpen} onClose={() => setMetaOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Pack</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" size="small" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} />
            <TextField label="Description" size="small" fullWidth multiline minRows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetaOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveMetadata} disabled={!editName.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      <AddContentDialog
        open={addOpen}
        type={addType}
        packId={pack.id}
        onClose={() => setAddOpen(false)}
        onCreated={handleFileCreated}
      />
    </PageLayout>
  );
}

function FileEntry({ file, expanded, resolvedContent, loading, onToggle, onEdit, onRewrite, onDelete }: {
  file: PackFile; expanded: boolean; resolvedContent: string | undefined;
  loading: boolean; onToggle: () => void;
  onEdit: () => void; onRewrite: () => void; onDelete: () => void;
}) {
  const fileName = file.path.split("/").pop() || file.path;
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box onClick={onToggle} sx={{ px: 1.5, py: 0.75, display: "flex", alignItems: "center", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}>
        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        <Typography variant="body2" fontFamily="monospace" sx={{ ml: 0.5, fontSize: 13, fontWeight: 600 }}>{fileName}</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>{file.path}</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Edit"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="AI Rewrite"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onRewrite(); }}><AutoFixHighIcon fontSize="small" color="secondary" /></IconButton></Tooltip>
        <Tooltip title="Copy"><IconButton size="small" onClick={(e) => { e.stopPropagation(); if (resolvedContent) navigator.clipboard.writeText(resolvedContent); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(); }}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
      </Box>
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 1.5, bgcolor: "action.hover", overflow: "auto", maxHeight: 500 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : resolvedContent ? (
            <Typography component="pre" variant="body2" fontFamily="monospace" sx={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }}>
              {resolvedContent}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              Content not available
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

function groupByDir(files: PackFile[]): Record<string, PackFile[]> {
  const result: Record<string, PackFile[]> = {};
  for (const f of files) {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    (result[dir] ??= []).push(f);
  }
  return result;
}
