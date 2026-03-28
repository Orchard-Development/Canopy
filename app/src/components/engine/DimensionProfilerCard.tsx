import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FingerprintIcon from "@mui/icons-material/Fingerprint";

interface Fix {
  skill: string;
  action: string;
  timestamp: string;
  dimensions: Record<string, boolean>;
}

interface ProfilerStatus {
  enabled: boolean;
  last_run: string | null;
  last_scan_count: number;
  last_fix_count: number;
  total_profiled: number;
  recent_fixes: Fix[];
  error?: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export function DimensionProfilerCard() {
  const [status, setStatus] = useState<ProfilerStatus | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/dispatch/profiler/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* engine unreachable */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 15_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handleToggle = async () => {
    if (!status) return;
    setToggling(true);
    await fetch("/api/dispatch/profiler/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !status.enabled }),
    });
    await fetchStatus();
    setToggling(false);
  };

  const handleScan = async () => {
    await fetch("/api/dispatch/profiler/scan", { method: "POST" });
    setTimeout(fetchStatus, 2000);
  };

  if (!status) {
    return (
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600}>
            Dimension Profiler
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const activeDims = (fix: Fix) =>
    Object.entries(fix.dimensions)
      .filter(([, v]) => v)
      .map(([k]) => k);

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <FingerprintIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight={600}>
            Dimension Profiler
          </Typography>
          <Chip
            label="30s watchdog"
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.6rem", height: 18 }}
          />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Scan now">
            <IconButton size="small" onClick={handleScan} sx={{ p: 0.25 }}>
              <PlayArrowIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Switch
            size="small"
            checked={status.enabled}
            disabled={toggling}
            onChange={handleToggle}
          />
        </Box>

        {/* Stats row */}
        <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Last scan: {timeAgo(status.last_run)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Skills: {status.last_scan_count}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Fixes (last): {status.last_fix_count}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total profiled: {status.total_profiled}
          </Typography>
        </Box>

        {/* Recent fixes */}
        {status.recent_fixes.length > 0 && (
          <>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ display: "block", mt: 1, mb: 0.5 }}
            >
              Recent fixes
            </Typography>
            <List dense disablePadding>
              {status.recent_fixes.slice(0, 5).map((fix, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {fix.skill}
                        </Typography>
                        <Chip
                          label={fix.action}
                          size="small"
                          color={fix.action === "added" ? "primary" : "warning"}
                          sx={{ fontSize: "0.55rem", height: 16 }}
                        />
                        {activeDims(fix).map((d) => (
                          <Chip
                            key={d}
                            label={d}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.55rem", height: 16 }}
                          />
                        ))}
                      </Box>
                    }
                    secondary={timeAgo(fix.timestamp)}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {status.recent_fixes.length === 0 && status.last_run && (
          <Typography variant="caption" color="text.secondary">
            All skills are correctly profiled.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
