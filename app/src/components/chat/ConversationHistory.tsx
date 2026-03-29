import { useEffect, useState, useCallback } from "react";
import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { api, type ConversationSummary } from "../../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationHistory({
  open,
  onClose,
  activeId,
  onSelect,
  onNew,
}: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    [],
  );

  const refresh = useCallback(() => {
    api
      .listConversations(50)
      .then((res) => setConversations(res.conversations ?? []))
      .catch(() => {});
  }, []);

  // Refresh when panel opens or active conversation changes
  useEffect(() => {
    if (open) refresh();
  }, [open, activeId, refresh]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteConversation(id);
    refresh();
  };

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        borderRight: 1,
        borderColor: "divider",
        display: open ? "flex" : "none",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 1.5, py: 1, gap: 0.5 }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ flex: 1 }}
        >
          History
        </Typography>
        <Tooltip title="New chat">
          <IconButton size="small" onClick={onNew}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close panel">
          <IconButton size="small" onClick={onClose}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {conversations.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 4, textAlign: "center" }}
        >
          No conversations yet
        </Typography>
      ) : (
        <List dense sx={{ flex: 1, overflow: "auto", pt: 0 }}>
          {conversations.map((c) => (
            <ListItemButton
              key={c.id}
              selected={c.id === activeId}
              onClick={() => onSelect(c.id)}
              sx={{ px: 1.5 }}
            >
              <ListItemText
                primary={c.title || "Untitled"}
                secondary={formatDate(c.updated_at)}
                primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
              <Box sx={{ flexShrink: 0 }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleDelete(c.id, e)}
                  sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
