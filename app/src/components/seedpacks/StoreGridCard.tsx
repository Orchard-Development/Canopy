import {
  Card, CardActionArea, Stack, Typography, Chip, Box, Button, Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import type { DiscoverPack } from "../../lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  discipline: "primary.main",
  workflow: "secondary.main",
  tools: "info.main",
  platform: "warning.main",
  research: "success.main",
  deploy: "error.main",
};

function getCategoryColor(category?: string): string {
  if (!category) return "divider";
  return CATEGORY_COLORS[category.toLowerCase()] ?? "primary.main";
}

interface StoreGridCardProps {
  pack: DiscoverPack;
  entitled: boolean;
  onInstall: () => void;
  onRemove: () => void;
  onClick: () => void;
}

export function StoreGridCard({ pack, entitled, onInstall, onRemove, onClick }: StoreGridCardProps) {
  const isFree = !pack.price_cents || pack.price_cents === 0;

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        borderColor: entitled ? "success.main" : "divider",
        borderWidth: 1,
        transition: "border-color 0.15s",
        "&:hover": { borderColor: entitled ? "success.main" : "primary.main" },
      }}
    >
      <Box sx={{ height: 4, bgcolor: getCategoryColor(pack.category), borderRadius: "inherit" }} />
      <CardActionArea onClick={onClick} sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {pack.name}
        </Typography>
        {pack.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.6em",
            }}
          >
            {pack.description}
          </Typography>
        )}
        <Stack direction="row" spacing={0.5} sx={{ mt: "auto", pt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
          {(pack.techStack || []).slice(0, 3).map((tech) => (
            <Chip key={tech} label={tech} size="small" variant="outlined" />
          ))}
          <Chip label={`v${pack.version}`} size="small" variant="outlined" />
        </Stack>
      </CardActionArea>
      <Box sx={{ px: 2, pb: 1.5, display: "flex", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
        {entitled ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Installed">
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </Tooltip>
            <Button size="small" color="error" variant="text" startIcon={<DeleteOutlineIcon />} onClick={onRemove}>
              Remove
            </Button>
          </Stack>
        ) : (
          <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={onInstall}>
            {isFree ? "Install" : `$${(pack.price_cents / 100).toFixed(2)}`}
          </Button>
        )}
      </Box>
    </Card>
  );
}
