import { useMemo, useState, useEffect, useCallback } from "react";
import { Box, Typography, Tooltip, IconButton, alpha, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { OrchardData } from "./types";
import type { ProfileStatus } from "../../lib/api";
import { api } from "../../lib/api";

interface StatsBarProps {
  data: OrchardData;
  onReprofile?: () => void;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCountdown(ms: number): string {
  const mins = Math.ceil(ms / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function StatsBar({ data, onReprofile }: StatsBarProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<ProfileStatus | null>(null);
  const [reprofiling, setReprofiling] = useState(false);

  const fetchStatus = useCallback(() => {
    api.getProfileStatus().then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handleReprofile = useCallback(async () => {
    setReprofiling(true);
    try {
      await api.reprofile();
      fetchStatus();
      onReprofile?.();
    } finally {
      setReprofiling(false);
    }
  }, [fetchStatus, onReprofile]);

  const stats = useMemo(() => {
    const sessionIds = new Set(data.sessions.map((s) => s.id));
    const connections = data.connections.filter((c) => sessionIds.has(c.session_id));
    const connectedSessionIds = new Set(connections.map((c) => c.session_id));
    const reuseRate =
      data.sessions.length > 0
        ? Math.round((connectedSessionIds.size / data.sessions.length) * 100)
        : 0;
    const clusterCount = new Set(data.sessions.map((s) => s.cluster)).size;

    return {
      sessions: data.sessions.length,
      seeds: data.seeds.length,
      connections: connections.length,
      clusters: clusterCount,
      reuseRate,
    };
  }, [data]);

  const p = theme.palette;

  const profiling = status?.profiling || reprofiling;
  const lastProfiled = status?.last_profiled_at
    ? formatTimeAgo(status.last_profiled_at)
    : "never";
  const nextIn = status?.next_reprofile_in_ms
    ? formatCountdown(status.next_reprofile_in_ms)
    : "?";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 0.8,
        bgcolor: alpha(p.background.paper, 0.85),
        borderBottom: 1,
        borderColor: "divider",
        backdropFilter: "blur(8px)",
      }}
    >
      <StatItem label="Sessions" value={stats.sessions.toLocaleString()} color={p.primary.main} />
      <StatItem label="Seeds" value={stats.seeds.toLocaleString()} color={p.warning.main} />
      <StatItem label="Reuse" value={`${stats.reuseRate}%`} color={p.success.main} />

      <Box sx={{ mx: 1, height: 16, borderLeft: 1, borderColor: "divider" }} />

      <LegendDot color={p.primary.light} label="Session" />
      <LegendDot color={p.error.light} label="Memory" />
      <LegendDot color={p.success.light} label="Proposal" />
      <LegendDot color={p.warning.light} label="Skill" />
      <LegendDot color={p.secondary.light} label="Rule" />

      <Box sx={{ flex: 1 }} />

      <Tooltip title={
        profiling ? "Reprofiling..." :
        `Last: ${lastProfiled} | Next: ${nextIn} | Click to reprofile now`
      }>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: "50%",
            bgcolor: profiling ? p.warning.main : p.success.main,
            animation: profiling ? "pulse 1.5s infinite" : "none",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.3 },
            },
          }} />
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
            {profiling ? "profiling..." : lastProfiled}
          </Typography>
          <IconButton
            size="small"
            onClick={handleReprofile}
            disabled={profiling}
            sx={{ color: "text.disabled", p: 0.3 }}
          >
            <RefreshIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ color, fontWeight: 700, fontSize: 14 }}>
        {value}
      </Typography>
    </Box>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{label}</Typography>
    </Box>
  );
}
