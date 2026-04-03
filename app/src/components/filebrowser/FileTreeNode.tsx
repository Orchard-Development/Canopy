import React from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import type { ProjectFileEntry } from "@/lib/api";

export interface FileTreeNodeProps {
  entry: ProjectFileEntry;
  depth: number;
  expanded: boolean;
  selected: boolean;
  onToggle: (entry: ProjectFileEntry) => void;
  onClick: (entry: ProjectFileEntry) => void;
}

export function FileTreeNode({
  entry,
  depth,
  expanded,
  selected,
  onToggle,
  onClick,
}: FileTreeNodeProps) {
  const handleClick = () => {
    if (entry.isDir) {
      onToggle(entry);
    } else {
      onClick(entry);
    }
  };

  const icon = entry.isDir ? (
    expanded ? (
      <FolderOpenIcon sx={{ color: "primary.main" }} />
    ) : (
      <FolderIcon sx={{ color: "primary.main" }} />
    )
  ) : (
    <InsertDriveFileIcon sx={{ color: "text.secondary" }} />
  );

  return (
    <ListItemButton
      dense
      selected={selected}
      onClick={handleClick}
      sx={{ pl: 2 + depth * 2 }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={entry.name}
        primaryTypographyProps={{ variant: "body2", noWrap: true }}
      />
    </ListItemButton>
  );
}
