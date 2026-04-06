import {
  Stack, Typography, TextField, Chip, CircularProgress,
  List, ListItemButton, ListItemText, Divider, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { PackCardData } from "./PackCard";

interface OrchardSettingsTabProps {
  packs: PackCardData[];
  search: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
  onPackClick: (id: string) => void;
}

export function OrchardSettingsTab({ packs, search, onSearchChange, loading, onPackClick }: OrchardSettingsTabProps) {
  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        placeholder="Search orchard packs..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ),
        }}
        sx={{ maxWidth: 360 }}
      />
      <Typography variant="caption" color="text.secondary">
        Platform packs that provide Orchard's rules, skills, workflows, and agent coordination.
      </Typography>

      {packs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No orchard packs match this search.
        </Typography>
      ) : (
        <List dense disablePadding>
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
                <Chip label="Required" size="small" color="success" sx={{ ml: 1 }} />
              </ListItemButton>
            </div>
          ))}
        </List>
      )}
    </Stack>
  );
}
