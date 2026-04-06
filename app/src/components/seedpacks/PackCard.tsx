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
import LockIcon from "@mui/icons-material/Lock";
import PsychologyIcon from "@mui/icons-material/Psychology";
import StorageIcon from "@mui/icons-material/Storage";

export interface PackCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source: "public" | "user" | string;
  fileCount: number;
  version: number;
  category?: string;
  techStack?: string[];
  /** Number of trained neural models bundled with this pack. */
  modelCount?: number;
  /** Total size of all bundled models in megabytes. */
  modelSizeMb?: number;
  /** Router accuracy percentage (0-100). */
  routerAccuracy?: number;
  /** True when pack rules have changed since the models were last trained. */
  modelsStale?: boolean;
  /** True when this pack is automatically applied to all new projects. */
  auto_apply?: boolean;
  /** Pack type: orchard platform pack or community store pack. */
  pack_type?: "orchard" | "community";
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
  const isPublic = pack.source === "public";
  const hasCheckbox = typeof selected === "boolean";
  const handleClick = hasCheckbox ? onToggle : onClick;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: hasCheckbox && selected ? "primary.main" : isPublic ? "primary.dark" : undefined,
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
          {pack.pack_type === "orchard" && (
            <Tooltip title="Always applied to all projects">
              <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="required" size="small" color="success" variant="outlined" />
            </Tooltip>
          )}
          {pack.category && (
            <Chip label={pack.category} size="small" color="primary" variant="outlined" />
          )}
          {(pack.techStack || []).map((tech) => (
            <Chip key={tech} label={tech} size="small" color="secondary" variant="outlined" />
          ))}
          {!!pack.modelCount && pack.modelCount > 0 && (
            <Tooltip title={pack.modelsStale ? "Models may be outdated -- rules have changed since training" : ""}>
              <Chip
                icon={<PsychologyIcon fontSize="small" />}
                label={`${pack.modelCount} model${pack.modelCount === 1 ? "" : "s"}`}
                size="small"
                color={pack.modelsStale ? "warning" : "default"}
                variant="outlined"
              />
            </Tooltip>
          )}
          {pack.modelSizeMb != null && (
            <Chip
              icon={<StorageIcon fontSize="small" />}
              label={`${pack.modelSizeMb} MB`}
              size="small"
              variant="outlined"
            />
          )}
          {pack.routerAccuracy != null && (
            <Chip
              label={`${Math.round(pack.routerAccuracy)}% accuracy`}
              size="small"
              variant="outlined"
            />
          )}
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
