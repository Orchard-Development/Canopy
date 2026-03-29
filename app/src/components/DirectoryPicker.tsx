import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  TextField,
  Breadcrumbs,
  Link,
  Box,
  Skeleton,
  CircularProgress,
  Chip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";

interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface BrowseResult {
  current: string;
  parent: string;
  entries: DirEntry[];
  exists: boolean;
}

async function browse(dirPath?: string): Promise<BrowseResult> {
  const qs = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
  const res = await fetch(`/api/fs/browse${qs}`);
  return res.json();
}

async function mkdir(dirPath: string): Promise<{ path: string; created: boolean }> {
  const res = await fetch("/api/fs/mkdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: dirPath }),
  });
  return res.json();
}

interface DirectoryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  title?: string;
}

export function DirectoryPicker({ open, onClose, onSelect, title }: DirectoryPickerProps) {
  const theme = useTheme();
  const [current, setCurrent] = useState("");
  const [parent, setParent] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolder, setNewFolder] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback((dir?: string) => {
    setLoading(true);
    browse(dir)
      .then((r) => {
        setCurrent(r.current ?? "");
        setParent(r.parent ?? "");
        setEntries(r.entries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function createAndEnter() {
    if (!newFolder.trim()) return;
    const fullPath = current.endsWith("/")
      ? `${current}${newFolder.trim()}`
      : `${current}/${newFolder.trim()}`;
    setCreating(true);
    mkdir(fullPath)
      .then(() => {
        setNewFolder("");
        setShowNew(false);
        load(fullPath);
      })
      .catch(() => {})
      .finally(() => setCreating(false));
  }

  function handleSelect() {
    onSelect(current);
    onClose();
  }

  const breadcrumbs = (current || "").split("/").filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title ?? "Choose Location"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Breadcrumb navigation */}
          <Breadcrumbs sx={{ fontSize: "0.8rem" }}>
            <Link
              component="button"
              underline="hover"
              onClick={() => load("/")}
              sx={{ fontSize: "0.8rem" }}
            >
              /
            </Link>
            {breadcrumbs.map((seg, i) => {
              const fullPath = "/" + breadcrumbs.slice(0, i + 1).join("/");
              const isLast = i === breadcrumbs.length - 1;
              return isLast ? (
                <Typography key={fullPath} variant="body2" color="text.primary" sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                  {seg}
                </Typography>
              ) : (
                <Link
                  key={fullPath}
                  component="button"
                  underline="hover"
                  onClick={() => load(fullPath)}
                  sx={{ fontSize: "0.8rem" }}
                >
                  {seg}
                </Link>
              );
            })}
          </Breadcrumbs>

          {/* Directory listing */}
          <Box sx={{
            maxHeight: 320,
            overflow: "auto",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: alpha(theme.palette.text.secondary, 0.15),
              borderRadius: 3,
              "&:hover": { background: alpha(theme.palette.text.secondary, 0.25) },
            },
          }}>
            {loading ? (
              <Stack spacing={0.5} sx={{ p: 0.5 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: 0.5 }} />
                ))}
              </Stack>
            ) : (
              <List dense disablePadding>
                {parent && parent !== current && (
                  <ListItemButton onClick={() => load(parent)} sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ArrowUpwardIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary=".."
                      primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                    />
                  </ListItemButton>
                )}
                {entries.map((e) => (
                  <ListItemButton key={e.path} onDoubleClick={() => load(e.path)} sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <FolderIcon fontSize="small" sx={{ color: "primary.main" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={e.name}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItemButton>
                ))}
                {entries.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                    Empty directory
                  </Typography>
                )}
              </List>
            )}
          </Box>

          {/* New folder controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              startIcon={<CreateNewFolderIcon />}
              onClick={() => setShowNew((p) => !p)}
              variant={showNew ? "contained" : "outlined"}
              sx={{ textTransform: "none" }}
            >
              New folder
            </Button>
            {showNew && (
              <>
                <TextField
                  size="small"
                  placeholder="Folder name"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createAndEnter(); }}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  disabled={!newFolder.trim() || creating}
                  startIcon={creating ? <CircularProgress size={14} /> : undefined}
                  onClick={createAndEnter}
                  sx={{ textTransform: "none" }}
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </>
            )}
          </Stack>

          {/* Selected path indicator */}
          {current && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">Selected:</Typography>
              <Chip
                label={current}
                size="small"
                variant="outlined"
                sx={{ fontFamily: "monospace", fontSize: 11, maxWidth: "100%" }}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSelect}
          disabled={!current}
          sx={{ textTransform: "none" }}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}
