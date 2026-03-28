import { useState, useEffect } from "react";
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Skeleton,
  Alert,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "@/lib/api";
import type { DbSchemaTable } from "@/lib/api";

interface SchemaPanelProps {
  onInsertTable: (name: string) => void;
}

export default function SchemaPanel({ onInsertTable }: SchemaPanelProps) {
  const [tables, setTables] = useState<DbSchemaTable[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dbSchema();
      setTables(res.tables);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 1 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ overflow: "auto", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Tables ({tables.length})
        </Typography>
        <Tooltip title="Refresh schema">
          <IconButton size="small" onClick={fetchSchema}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <List dense disablePadding>
        {tables.map((t) => (
          <Box key={t.name}>
            <ListItemButton
              onClick={() => toggle(t.name)}
              onDoubleClick={() => onInsertTable(t.name)}
              sx={{ py: 0.25 }}
            >
              {expanded.has(t.name) ? (
                <ExpandMore fontSize="small" sx={{ mr: 0.5 }} />
              ) : (
                <ChevronRight fontSize="small" sx={{ mr: 0.5 }} />
              )}
              <ListItemText
                primary={t.name}
                primaryTypographyProps={{ variant: "body2", fontFamily: "monospace" }}
              />
              <Chip label={t.columns.length} size="small" variant="outlined" />
            </ListItemButton>
            <Collapse in={expanded.has(t.name)}>
              <List dense disablePadding sx={{ pl: 4 }}>
                {t.columns.map((c) => (
                  <ListItemButton
                    key={c.name}
                    sx={{ py: 0 }}
                    onClick={() => onInsertTable(`${t.name}.${c.name}`)}
                  >
                    <ListItemText
                      primary={c.name}
                      primaryTypographyProps={{
                        variant: "caption",
                        fontFamily: "monospace",
                      }}
                    />
                    <Chip
                      label={c.type || "TEXT"}
                      size="small"
                      sx={{ fontSize: "0.65rem", height: 18 }}
                    />
                    {c.pk && (
                      <Chip
                        label="PK"
                        size="small"
                        color="primary"
                        sx={{ fontSize: "0.65rem", height: 18, ml: 0.5 }}
                      />
                    )}
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </Box>
  );
}
