import { useState, useEffect, useCallback } from "react";
import {
  Alert, Box, Button, Card, CardActionArea, CardContent,
  Chip, IconButton, Skeleton, Stack, Tooltip, Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "@/lib/api";
import type { DbSchemaTable } from "@/lib/api";
import ResultsTable from "./ResultsTable";
import { CardGrid } from "@/components/CardGrid";

interface TableStats {
  name: string;
  columns: DbSchemaTable["columns"];
  rowCount: number | null;
}

interface BrowseState {
  columns: string[] | null;
  rows: unknown[][] | null;
  count: number | null;
  error: string | null;
  loading: boolean;
}

function TableCard({ t, onSelect }: { t: TableStats; onSelect: () => void }) {
  const pkCols = t.columns.filter((c) => c.pk);
  const otherCols = t.columns.filter((c) => !c.pk).slice(0, 3 - pkCols.length);
  const preview = [...pkCols, ...otherCols];
  const overflow = t.columns.length - preview.length;

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardActionArea onClick={onSelect} sx={{ height: "100%", p: 1.5, alignItems: "flex-start" }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="body2" fontFamily="monospace" fontWeight={600} noWrap>
            {t.name}
          </Typography>
          <Stack direction="row" spacing={0.75} mt={0.75}>
            <Chip
              label={t.rowCount != null ? `${t.rowCount.toLocaleString()} rows` : "..."}
              size="small"
              variant="outlined"
            />
            <Chip label={`${t.columns.length} cols`} size="small" variant="outlined" />
          </Stack>
          <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {preview.map((c) => (
              <Chip
                key={c.name}
                label={c.name}
                size="small"
                color={c.pk ? "primary" : "default"}
                sx={{ fontSize: "0.65rem", height: 18 }}
              />
            ))}
            {overflow > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                +{overflow}
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DatabaseOverview() {
  const [tables, setTables] = useState<TableStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [browse, setBrowse] = useState<BrowseState>({
    columns: null, rows: null, count: null, error: null, loading: false,
  });

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dbSchema();
      const initial = res.tables.map((t) => ({ name: t.name, columns: t.columns, rowCount: null }));
      setTables(initial);
      res.tables.forEach(async (t, i) => {
        try {
          const r = await api.dbQuery(`SELECT COUNT(*) FROM "${t.name}"`);
          const n = r.rows[0]?.[0] as number ?? null;
          setTables((prev) => prev.map((row, idx) => idx === i ? { ...row, rowCount: n } : row));
        } catch { /* ignore */ }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schema");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchema(); }, [fetchSchema]);

  const openTable = useCallback(async (name: string) => {
    setSelected(name);
    setBrowse({ columns: null, rows: null, count: null, error: null, loading: true });
    try {
      const r = await api.dbQuery(`SELECT * FROM "${name}" LIMIT 500`);
      setBrowse({ columns: r.columns, rows: r.rows, count: r.count, error: null, loading: false });
    } catch (e) {
      setBrowse({ columns: null, rows: null, count: null, error: e instanceof Error ? e.message : "Query failed", loading: false });
    }
  }, []);

  if (selected) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => setSelected(null)}>
            All Tables
          </Button>
          <Typography variant="subtitle2" fontFamily="monospace" color="text.secondary">
            {selected}
          </Typography>
          {browse.count != null && (
            <Chip label={`${browse.count.toLocaleString()} rows`} size="small" variant="outlined" sx={{ ml: "auto" }} />
          )}
        </Box>
        {browse.loading ? (
          <Stack spacing={1}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={32} />)}</Stack>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ResultsTable
              columns={browse.columns}
              rows={browse.rows}
              count={browse.count}
              timeMs={null}
              capped={(browse.count ?? 0) >= 500}
              error={browse.error}
            />
          </Box>
        )}
      </Box>
    );
  }

  if (loading && tables.length === 0) {
    return <CardGrid minWidth={220}>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={100} variant="rounded" />)}</CardGrid>;
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {tables.length} tables — click any to browse
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchSchema}><RefreshIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
      <CardGrid minWidth={220}>
        {tables.map((t) => <TableCard key={t.name} t={t} onSelect={() => openTable(t.name)} />)}
      </CardGrid>
    </Box>
  );
}
