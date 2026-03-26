import type React from "react";
import {
  Card,
  CardActionArea,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export interface PackCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source: "shipped" | "user" | string;
  fileCount: number;
  version: number;
  category?: string;
  techStack?: string[];
}

interface Props {
  pack: PackCardData;
  /** When provided, renders a checkbox and the card toggles it on click. */
  selected?: boolean;
  onToggle?: () => void;
  /** When provided, the card navigates on click instead. */
  onClick?: () => void;
  /** Delete handler -- renders a trash icon on the right. */
  onDelete?: (e: React.MouseEvent, id: string) => void;
  compact?: boolean;
}

/**
 * Reusable seed pack card. Used in:
 * - SeedPacks list view (onClick navigates)
 * - Chat form seed pack selector (selected + onToggle)
 */
export function PackCard({
  pack,
  selected,
  onToggle,
  onClick,
  onDelete,
  compact,
}: Props) {
  const isShipped = pack.source === "shipped";
  const hasCheckbox = typeof selected === "boolean";
  const handleClick = hasCheckbox ? onToggle : onClick;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: hasCheckbox && selected ? "primary.main" : isShipped ? "primary.dark" : undefined,
        borderWidth: hasCheckbox && selected ? 2 : 1,
        transition: "border-color 0.15s",
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ p: compact ? 1.5 : 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap" }}>
          {hasCheckbox && (
            <Checkbox
              checked={selected}
              size="small"
              sx={{ p: 0, mr: 0.5 }}
              tabIndex={-1}
            />
          )}
          <Typography variant="body2" fontWeight={600}>{pack.name}</Typography>
          <Chip label={`v${pack.version}`} size="small" variant="outlined" />
          <Chip label={`${pack.fileCount} files`} size="small" variant="outlined" />
          {isShipped && (
            <Chip label="shipped" size="small" color="primary" variant="outlined" />
          )}
          {pack.category && (
            <Chip label={pack.category} size="small" color="primary" variant="outlined" />
          )}
          {(pack.techStack || []).map((tech) => (
            <Chip key={tech} label={tech} size="small" color="secondary" variant="outlined" />
          ))}
          {onDelete && (
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onDelete(e, pack.id); }}
                sx={{ ml: "auto !important" }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {pack.description && !compact && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {pack.description}
          </Typography>
        )}
      </CardActionArea>
    </Card>
  );
}
