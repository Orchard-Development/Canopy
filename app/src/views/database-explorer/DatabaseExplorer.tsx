import { useState, useRef, useCallback } from "react";
import { Box, Drawer, Typography } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import SchemaPanel from "./SchemaPanel";
import QueryEditor from "./QueryEditor";
import type { QueryEditorHandle } from "./QueryEditor";
import ResultsTable from "./ResultsTable";
import { api } from "@/lib/api";

const SIDEBAR_WIDTH = 260;

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  count: number;
  timeMs: number;
  capped: boolean;
}

export default function DatabaseExplorer() {
  const editorRef = useRef<QueryEditorHandle>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInsertTable = useCallback((name: string) => {
    editorRef.current?.insertText(name);
  }, []);

  const handleExecute = useCallback(async (sql: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dbQuery(sql);
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Query failed";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            position: "relative",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <SchemaPanel onInsertTable={handleInsertTable} />
      </Drawer>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <StorageIcon color="primary" />
          <Typography variant="h6">Database Explorer</Typography>
          <Typography variant="caption" color="text.secondary">
            context.db
          </Typography>
        </Box>

        <QueryEditor ref={editorRef} onExecute={handleExecute} loading={loading} />

        <Box sx={{ flex: 1, mt: 2, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <ResultsTable
            columns={result?.columns ?? null}
            rows={result?.rows ?? null}
            count={result?.count ?? null}
            timeMs={result?.timeMs ?? null}
            capped={result?.capped ?? false}
            error={error}
          />
        </Box>
      </Box>
    </Box>
  );
}
