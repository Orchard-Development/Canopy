import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Skeleton, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";

interface ModelRow {
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  calls: number;
  estimated_cost_cents: number;
}

interface SourceRow {
  source: string;
  input_tokens: number;
  output_tokens: number;
  calls: number;
}

interface DailyRow {
  date: string;
  input_tokens: number;
  output_tokens: number;
  calls: number;
}

interface StatsData {
  totals: { input_tokens: number; output_tokens: number; estimated_cost_cents: number; calls: number };
  by_model: ModelRow[];
  by_source: SourceRow[];
  daily: DailyRow[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function UsageStatsCard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usage/stats")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography color="error">Failed to load usage stats: {error}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={120} />
        </CardContent>
      </Card>
    );
  }

  const { totals, by_model, by_source, daily } = data;
  const costDollars = (totals.estimated_cost_cents / 100).toFixed(2);

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Usage Summary</Typography>
          <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Input Tokens</Typography>
              <Typography variant="h5">{fmt(totals.input_tokens)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Output Tokens</Typography>
              <Typography variant="h5">{fmt(totals.output_tokens)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Estimated Cost</Typography>
              <Typography variant="h5">${costDollars}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">API Calls</Typography>
              <Typography variant="h5">{fmt(totals.calls)}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {daily.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Daily Usage (30 days)</Typography>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="input_tokens" name="Input" stackId="a" fill="#1565C0" />
                <Bar dataKey="output_tokens" name="Output" stackId="a" fill="#42A5F5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>By Model</Typography>
          {by_model.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No data yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Input</TableCell>
                  <TableCell align="right">Output</TableCell>
                  <TableCell align="right">Calls</TableCell>
                  <TableCell align="right">Est. Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {by_model.map((row) => (
                  <TableRow key={`${row.model}-${row.provider}`}>
                    <TableCell sx={{ fontSize: 12 }}>{row.model}</TableCell>
                    <TableCell align="right">{fmt(row.input_tokens)}</TableCell>
                    <TableCell align="right">{fmt(row.output_tokens)}</TableCell>
                    <TableCell align="right">{row.calls}</TableCell>
                    <TableCell align="right">${(row.estimated_cost_cents / 100).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>By Source</Typography>
          {by_source.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No data yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Input</TableCell>
                  <TableCell align="right">Output</TableCell>
                  <TableCell align="right">Calls</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {by_source.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell>{row.source}</TableCell>
                    <TableCell align="right">{fmt(row.input_tokens)}</TableCell>
                    <TableCell align="right">{fmt(row.output_tokens)}</TableCell>
                    <TableCell align="right">{row.calls}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
