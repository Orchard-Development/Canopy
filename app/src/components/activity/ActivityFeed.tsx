import { useRef, useEffect, useState } from "react";
import { Box, Typography, Chip } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { ActivityEntry, Severity } from "../../hooks/useActivityFeed";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatRelativeTime(iso: string): string {
  const delta = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  return formatTime(iso);
}

const severityConfig: Record<
  Severity,
  { color: "success" | "error" | "warning" | "info"; border: string; icon: React.ReactElement }
> = {
  success: { color: "success", border: "success.main", icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> },
  error: { color: "error", border: "error.main", icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
  warning: { color: "warning", border: "warning.main", icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  info: { color: "info", border: "primary.main", icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} /> },
};

interface Props {
  entries: ActivityEntry[];
  lastSync?: string | null;
  autoScroll?: boolean;
}

export function ActivityFeed({ entries, lastSync, autoScroll = true }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSync) return;
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, [lastSync]);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, autoScroll]);

  if (entries.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "text.secondary" }}>
        <Typography variant="body2">No activity yet</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: "auto", px: 1.5, py: 1 }}>
      {entries.map((entry) => {
        const cfg = severityConfig[entry.severity];
        return (
          <Box
            key={entry.id}
            sx={{
              mb: 1,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: "action.hover",
              borderLeft: 3,
              borderColor: cfg.border,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Chip
                icon={cfg.icon}
                label={formatTime(entry.timestamp)}
                size="small"
                variant="filled"
                sx={{ fontFamily: "monospace", fontSize: 11, height: 20, bgcolor: "action.selected" }}
              />
              {entry.sessionId && (
                <Chip
                  label={entry.sessionId.slice(0, 8)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18, fontFamily: "monospace" }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.6 }}>
              {entry.summary}
            </Typography>
          </Box>
        );
      })}
      {lastSync && (
        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", color: "text.disabled", py: 0.5 }}
        >
          Last synced {formatRelativeTime(lastSync)}
        </Typography>
      )}
      <div ref={endRef} />
    </Box>
  );
}
