import { useState, useEffect } from "react";
import {
  Box, Typography, Stack, IconButton, Chip, CircularProgress, Tooltip,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { api, type TunnelSession } from "../../lib/api";

function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

function sessionLabel(s: TunnelSession) {
  if (s.email) return s.email;
  if (s.remote_ip) return s.remote_ip;
  return "Anonymous";
}

export function TunnelSessionsSection() {
  const [sessions, setSessions] = useState<TunnelSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    api.listTunnelSessions()
      .then((r) => setSessions(r.sessions))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, []);

  async function handleRevoke(token: string) {
    try {
      await api.revokeTunnelSession(token);
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch { /* ignore */ }
  }

  if (loading) return <CircularProgress size={20} sx={{ mt: 2 }} />;
  if (sessions.length === 0) return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>Active sessions</Typography>
      <Typography variant="caption" color="text.secondary">No active tunnel sessions.</Typography>
    </Box>
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
        Active sessions ({sessions.length})
      </Typography>
      <Stack spacing={0.75}>
        {sessions.map((s) => (
          <Stack key={s.token} direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 13 }}>
                {sessionLabel(s)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.type ?? "session"} &middot; {relTime(s.created_at)}
                {s.role && ` · ${s.role}`}
              </Typography>
            </Box>
            {s.permissions && (
              <Chip label={s.permissions.length > 3 ? "full" : "scoped"} size="small" />
            )}
            <Tooltip title="Revoke session">
              <IconButton size="small" onClick={() => handleRevoke(s.token)} color="error">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
