import { Box, Typography, IconButton } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";

export interface EditorTabProps {
  filename: string;
  isActive: boolean;
  isDirty: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export function EditorTab({ filename, isActive, isDirty, onActivate, onClose }: EditorTabProps) {
  return (
    <Box
      onClick={onActivate}
      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); onClose(); } }}
      sx={{
        display: "flex", alignItems: "center", gap: 0.5,
        px: 1, py: 0.25, cursor: "pointer", userSelect: "none",
        borderBottom: 2,
        borderColor: isActive ? "primary.main" : "transparent",
        bgcolor: isActive ? "action.selected" : "transparent",
        "&:hover": isActive ? undefined : { bgcolor: "action.hover" },
      }}
    >
      <Typography
        variant="body2"
        noWrap
        sx={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "text.primary" : "text.secondary" }}
      >
        {filename}
      </Typography>
      {isDirty && (
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} />
      )}
      <IconButton
        size="small"
        color="inherit"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        sx={{ p: 0.25, ml: 0.25, opacity: 0.5, "&:hover": { opacity: 1 } }}
      >
        <CloseRounded sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}
