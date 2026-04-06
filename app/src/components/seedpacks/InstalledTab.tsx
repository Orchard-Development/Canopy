import {
  Stack, Typography, Chip, CircularProgress, IconButton, Tooltip,
  List, ListItemButton, ListItemText, Divider,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { DiscoverPack } from "../../lib/api";

interface InstalledTabProps {
  packs: DiscoverPack[];
  loading: boolean;
  onRemove: (packId: string) => void;
  onPackClick: (id: string) => void;
}

export function InstalledTab({ packs, loading, onRemove, onPackClick }: InstalledTabProps) {
  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        Packs you've installed from the store. These sync across all your machines.
      </Typography>

      {packs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No installed packs yet. Browse the Store to find packs.
        </Typography>
      ) : (
        <List disablePadding>
          {packs.map((pack, i) => (
            <div key={pack.id}>
              {i > 0 && <Divider component="li" />}
              <ListItemButton onClick={() => onPackClick(pack.id)} sx={{ py: 1 }}>
                <ListItemText
                  primary={pack.name}
                  secondary={pack.description}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600, noWrap: true }}
                  secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                />
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1, flexShrink: 0 }}>
                  <Chip label={`v${pack.version}`} size="small" variant="outlined" />
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); onRemove(pack.id); }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItemButton>
            </div>
          ))}
        </List>
      )}
    </Stack>
  );
}
