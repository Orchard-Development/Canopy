import {
  Card, CardActionArea, Stack, Typography, Chip, Button, Box, Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import type { DiscoverPack } from "../../lib/api";

interface StorePackCardProps {
  pack: DiscoverPack;
  entitled: boolean;
  onInstall: () => void;
  onRemove: () => void;
  onClick: () => void;
}

export function StorePackCard({ pack, entitled, onInstall, onRemove, onClick }: StorePackCardProps) {
  const isFree = !pack.price_cents || pack.price_cents === 0;
  const isCore = pack.auto_apply;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: entitled ? "success.main" : "divider",
        borderWidth: entitled ? 2 : 1,
        "&:hover": { borderColor: entitled ? "success.main" : "primary.main" },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" noWrap>{pack.name}</Typography>
              <Chip label={`v${pack.version}`} size="small" variant="outlined" />
              <Chip label={`${pack.fileCount} files`} size="small" variant="outlined" />
              {pack.category && (
                <Chip label={pack.category} size="small" color="default" />
              )}
              {isCore && (
                <Chip label="Core" size="small" color="primary" icon={<LockIcon />} />
              )}
              {entitled && (
                <Tooltip title={`Source: ${pack.entitlement_source || "free"}`}>
                  <Chip
                    label="Installed"
                    size="small"
                    color="success"
                    icon={<CheckCircleIcon />}
                  />
                </Tooltip>
              )}
              {!isFree && (
                <Chip
                  label={`$${(pack.price_cents / 100).toFixed(2)}`}
                  size="small"
                  color="warning"
                />
              )}
            </Stack>
            {pack.description && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                {pack.description}
              </Typography>
            )}
          </Box>

          <Box onClick={(e) => e.stopPropagation()}>
            {entitled && !isCore ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={(e) => { e.preventDefault(); onRemove(); }}
              >
                Remove
              </Button>
            ) : !entitled ? (
              <Button
                size="small"
                color="primary"
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={(e) => { e.preventDefault(); onInstall(); }}
              >
                {isFree ? "Install" : "Buy"}
              </Button>
            ) : null}
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
