import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, List, ListItemButton, ListItemText,
  ListSubheader, Chip, CircularProgress, Box, Typography,
} from "@mui/material";

interface Model { id: string; label?: string; provider?: string; default?: boolean }

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
}

export function OrchardModelPicker({ open, onClose, onSelect }: Props) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [defaultId, setDefaultId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch("/api/ai/models").then((r) => r.json()),
      fetch("/api/gateway/models").then((r) => r.json()),
    ])
      .then(([aiData, gwData]: [{ models: Model[] }, { default?: string }]) => {
        // Use the full model list from /api/ai/models, but normalize IDs
        // to include provider prefix (e.g. "xai/grok-3") for gateway routing.
        const models = (aiData.models ?? [])
          .map((m) => ({
            ...m,
            id: m.id.includes("/") ? m.id : `${m.provider}/${m.id}`,
          }));
        setModels(models);
        setDefaultId(gwData.default ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, Model[]>();
    for (const m of models) {
      const provider = m.provider || "Other";
      if (!map.has(provider)) map.set(provider, []);
      map.get(provider)!.push(m);
    }
    return map;
  }, [models]);

  const defaultModelId = defaultId;

  const handleSelect = (modelId: string) => {
    onSelect(modelId);
    onClose();
  };

  const isEmpty = !loading && !error && models.length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Select Model</DialogTitle>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ px: 3, pb: 3, fontSize: 14 }}>
          Failed to load models. Check your connection and try again.
        </Typography>
      )}
      {isEmpty && (
        <Typography color="text.secondary" sx={{ px: 3, pb: 3, fontSize: 14 }}>
          No AI providers configured. Add API keys in Settings.
        </Typography>
      )}
      {!loading && !error && models.length > 0 && (
        <List sx={{ pt: 0, pb: 1 }}>
          {[...grouped.entries()].map(([provider, providerModels]) => (
            <li key={provider}>
              <ListSubheader sx={{ lineHeight: "32px", fontWeight: 600 }}>
                {provider}
              </ListSubheader>
              {providerModels.map((model) => (
                <ListItemButton
                  key={model.id}
                  selected={model.id === defaultModelId}
                  onClick={() => handleSelect(model.id)}
                  sx={{ py: 0.75, px: 3 }}
                >
                  <ListItemText
                    primary={model.label || model.id}
                    primaryTypographyProps={{ fontSize: 14 }}
                  />
                  {model.id === defaultModelId && (
                    <Chip
                      label="default"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11, "& .MuiChip-label": { px: 0.75 } }}
                    />
                  )}
                </ListItemButton>
              ))}
            </li>
          ))}
        </List>
      )}
    </Dialog>
  );
}
