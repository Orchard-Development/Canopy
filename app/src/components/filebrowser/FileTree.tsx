import { useCallback } from "react";
import { Box, TextField, InputAdornment, List, CircularProgress, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useFileTree } from "@/hooks/useFileTree";
import { FileTreeNode } from "./FileTreeNode";
import type { ProjectFileEntry } from "@/lib/api";

export interface FileTreeProps {
  rootPath: string;
  onFileSelect: (path: string) => void;
  activeFile?: string;
}

export function FileTree({ rootPath, onFileSelect, activeFile }: FileTreeProps) {
  const {
    tree,
    expanded,
    error,
    initialLoading,
    filter,
    expandFolder,
    collapseFolder,
    setFilter,
  } = useFileTree(rootPath);

  const handleToggle = useCallback(
    (entry: ProjectFileEntry) => {
      expanded.has(entry.path) ? collapseFolder(entry.path) : expandFolder(entry.path);
    },
    [expanded, expandFolder, collapseFolder],
  );

  const handleClick = useCallback(
    (entry: ProjectFileEntry) => { if (!entry.isDir) onFileSelect(entry.path); },
    [onFileSelect],
  );

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          margin="dense"
          fullWidth
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {initialLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Typography color="error" variant="body2" sx={{ px: 2, py: 1 }}>
          {error}
        </Typography>
      )}
      <List dense disablePadding sx={{ flex: 1, overflow: "auto" }}>
        {tree.map(({ entry, depth }) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={depth}
            expanded={expanded.has(entry.path)}
            selected={entry.path === activeFile}
            onToggle={handleToggle}
            onClick={handleClick}
          />
        ))}
      </List>
    </Box>
  );
}
