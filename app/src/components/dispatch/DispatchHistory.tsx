import { Box, Chip, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import type { DispatchRecord } from "../../types/dispatch";

interface Props {
  records: DispatchRecord[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function DispatchHistory({ records }: Props) {
  if (records.length === 0) return null;

  return (
    <Box sx={{ width: "100%", maxWidth: 640, mt: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        Recent Dispatches
      </Typography>
      <List dense disablePadding>
        {records.map((r) => (
          <ListItemButton key={r.id} sx={{ borderRadius: 1, py: 0.5 }}>
            <ListItemText
              primary={r.input.length > 80 ? `${r.input.slice(0, 80)}...` : r.input}
              secondary={formatTime(r.timestamp)}
              slotProps={{ primary: { noWrap: true, fontSize: 13 } }}
            />
            <Chip label={r.payload.analysis.agent} size="small" sx={{ ml: 1 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
