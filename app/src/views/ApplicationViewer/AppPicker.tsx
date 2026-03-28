import { useState, useEffect, useCallback } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";

interface WindowInfo {
  title: string;
  pid?: number;
  app?: string;
  region: { x: number; y: number; width: number; height: number };
}

interface AppPickerProps {
  onSelect: (target: { title: string; pid?: number }) => void;
}

export function AppPicker({ onSelect }: AppPickerProps) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!window.orchard?.viewer?.listWindows) {
      setError("Application Viewer requires the desktop app");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await window.orchard.viewer.listWindows();
      setWindows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to list windows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filtered = windows.filter(
    (w) =>
      w.title.toLowerCase().includes(filter.toLowerCase()) ||
      w.app?.toLowerCase().includes(filter.toLowerCase()),
  );

  if (error) return <Alert severity="warning" sx={{ m: 1 }}>{error}</Alert>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TextField
        size="small"
        placeholder="Filter windows..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        fullWidth
      />
      {loading && windows.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
          No windows found
        </Typography>
      ) : (
        <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
          {filtered.map((w, i) => (
            <ListItemButton
              key={`${w.title}-${w.pid ?? i}`}
              onClick={() => onSelect({ title: w.title, pid: w.pid })}
            >
              <ListItemText
                primary={w.title}
                secondary={w.app ? `${w.app} (${w.region.width}x${w.region.height})` : undefined}
                primaryTypographyProps={{ noWrap: true }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
