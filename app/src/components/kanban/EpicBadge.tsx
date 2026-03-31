import { Chip } from "@mui/material";
import type { Epic } from "../../hooks/useKanban";

interface EpicBadgeProps {
  epic: Epic;
}

export function EpicBadge({ epic }: EpicBadgeProps) {
  return (
    <Chip
      label={epic.title}
      size="small"
      variant="outlined"
      sx={{
        height: 22,
        borderColor: epic.color,
        color: epic.color,
        maxWidth: 140,
        "& .MuiChip-label": {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          px: 0.75,
          fontSize: "0.75rem",
        },
      }}
    />
  );
}
