import { useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Chip,
  Alert,
} from "@mui/material";

interface ResultsTableProps {
  columns: string[] | null;
  rows: unknown[][] | null;
  count: number | null;
  timeMs: number | null;
  capped: boolean;
  error: string | null;
}

const ROWS_PER_PAGE = 50;

export default function ResultsTable({
  columns,
  rows,
  count,
  timeMs,
  capped,
  error,
}: ResultsTableProps) {
  const [page, setPage] = useState(0);

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!columns) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Run a query to see results
        </Typography>
      </Box>
    );
  }

  if (rows && rows.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No rows returned
        </Typography>
        {timeMs != null && (
          <Chip label={`${timeMs}ms`} size="small" sx={{ mt: 1 }} />
        )}
      </Box>
    );
  }

  const displayRows = rows ?? [];
  const paged = displayRows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5 }}>
        {count != null && (
          <Chip label={`${count} row${count !== 1 ? "s" : ""}`} size="small" variant="outlined" />
        )}
        {capped && <Chip label="capped at 1000" size="small" color="warning" />}
        {timeMs != null && <Chip label={`${timeMs}ms`} size="small" variant="outlined" />}
      </Box>
      <TableContainer sx={{ flex: 1, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row, ri) => (
              <TableRow key={ri} hover>
                {row.map((cell, ci) => (
                  <TableCell key={ci} sx={{ fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {cell === null ? (
                      <Typography variant="caption" color="text.disabled" fontStyle="italic">
                        NULL
                      </Typography>
                    ) : (
                      String(cell)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {displayRows.length > ROWS_PER_PAGE && (
        <TablePagination
          component="div"
          count={displayRows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
        />
      )}
    </Box>
  );
}
