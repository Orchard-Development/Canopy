import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";

interface LogEntry {
  level: string;
  message: string;
  source: string;
  timestamp: string;
}

type Level = "all" | "debug" | "info" | "warning" | "error";

const LEVEL_COLORS: Record<string, string> = {
  error: "#f44336",
  warning: "#ff9800",
  warn: "#ff9800",
  info: "#90caf9",
  debug: "#78909c",
};

export function EngineLogsCard() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<Level>("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const bufferRef = useRef<LogEntry[]>([]);

  const { channel } = useDashboardChannel();

  // Initial fetch to hydrate existing logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (level !== "all") params.set("level", level);
      if (source !== "all") params.set("source", source);
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) {
        setError(`Logs endpoint returned ${res.status}`);
        return;
      }
      const data: LogEntry[] = await res.json();
      setEntries(data);
      setError(null);
    } catch {
      setError("Logs endpoint unavailable");
    }
  }, [level, source]);

  // Fetch once on mount or when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Stream log entries via dashboard channel instead of polling
  useEffect(() => {
    if (!channel) return;

    const ref = channel.on("logs:batch", (data: { entries: LogEntry[] }) => {
      if (pausedRef.current) {
        bufferRef.current.push(...data.entries);
        if (bufferRef.current.length > 500) {
          bufferRef.current = bufferRef.current.slice(-500);
        }
        return;
      }
      setEntries((prev) => {
        const next = [...prev, ...data.entries];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    return () => {
      channel.off("logs:batch", ref);
    };
  }, [channel]);

  // Flush buffer on unpause
  useEffect(() => {
    if (paused || bufferRef.current.length === 0) return;
    setEntries((prev) => {
      const merged = [...prev, ...bufferRef.current];
      bufferRef.current = [];
      return merged.length > 500 ? merged.slice(-500) : merged;
    });
  }, [paused]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !autoScroll.current) return;
    el.scrollTop = el.scrollHeight;
  }, [entries]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  const sources = useMemo(() => {
    const set = new Set(entries.map((e) => e.source));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (level !== "all") result = result.filter((e) => e.level === level);
    if (source !== "all") result = result.filter((e) => e.source === source);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.message.toLowerCase().includes(q));
    }
    return result;
  }, [entries, level, source, search]);

  const display = useMemo(() => [...filtered].reverse(), [filtered]);

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" fontWeight={600}>Logs</Typography>

          <Select
            size="small"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            sx={{ minWidth: 90, fontSize: "0.7rem", height: 24 }}
          >
            <MenuItem value="all">All levels</MenuItem>
            <MenuItem value="debug">Debug</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>

          <Select
            size="small"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            sx={{ minWidth: 90, fontSize: "0.7rem", height: 24 }}
          >
            <MenuItem value="all">All sources</MenuItem>
            {sources.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>

          <TextField
            size="small"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 140, "& input": { fontSize: "0.7rem", py: 0.4 } }}
          />

          <Box sx={{ flex: 1 }} />

          <Chip
            label={`${display.length} lines`}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.6rem", height: 18 }}
          />

          <Tooltip title={paused ? "Resume" : "Pause"}>
            <IconButton size="small" onClick={() => setPaused((p) => !p)}>
              {paused ? <PlayArrowIcon sx={{ fontSize: 16 }} /> : <PauseIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh now">
            <IconButton size="small" onClick={fetchLogs}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear display">
            <IconButton size="small" onClick={() => setEntries([])}>
              <DeleteSweepIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }}>{error}</Alert>
        )}

        {/* Log output */}
        <Box
          ref={containerRef}
          onScroll={handleScroll}
          sx={{
            maxHeight: 480,
            overflow: "auto",
            bgcolor: "#0d1117",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            p: 1,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "0.7rem",
            lineHeight: 1.5,
          }}
        >
          {display.length === 0 && !error && (
            <Typography variant="caption" sx={{ color: "#6e7681" }}>
              No log entries
            </Typography>
          )}
          {display.map((entry, i) => (
            <LogRow key={i} entry={entry} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const color = LEVEL_COLORS[entry.level] ?? "#adbac7";
  const time = formatTimestamp(entry.timestamp);

  return (
    <Box sx={{ whiteSpace: "pre-wrap", wordBreak: "break-all", "&:hover": { bgcolor: "#161b22" } }}>
      <Box component="span" sx={{ color: "#6e7681" }}>{time} </Box>
      <Box component="span" sx={{ color, fontWeight: entry.level === "error" ? 600 : 400 }}>
        [{entry.level}]
      </Box>
      <Box component="span" sx={{ color: "#8b949e", fontSize: "0.65rem" }}> {entry.source}</Box>
      <Box component="span" sx={{ color: "#adbac7" }}> {entry.message}</Box>
    </Box>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return iso;
  }
}
