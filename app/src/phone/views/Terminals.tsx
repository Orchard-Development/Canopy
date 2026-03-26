import { useState, useEffect, useCallback } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import { useCommand, sendCommand } from "../../lib/remote-commands";
import { RemoteTerminal } from "../../components/terminal/RemoteTerminal";
import { TerminalToolbar } from "../../components/terminal/TerminalToolbar";

interface SessionInfo {
  id: string;
  command: string;
  cwd: string;
  startedAt: string;
  exitCode?: number;
  label?: string;
}

export function TerminalsView() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const { loading, execute } = useCommand();

  const refresh = useCallback(async () => {
    const res = await execute("terminal:list");
    if (res?.result && Array.isArray(res.result)) {
      setSessions(res.result as SessionInfo[]);
    }
  }, [execute]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    const res = await execute("terminal:create", { remoteAccess: true });
    if (res?.result) {
      const session = res.result as SessionInfo;
      setSessions((prev) => [...prev, session]);
      setActiveId(session.id);
    }
  };

  const handleKey = (key: string) => {
    if (activeId) {
      sendCommand("terminal:input", { sessionId: activeId, data: key });
    }
  };

  if (activeId) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", p: 1, borderBottom: 1, borderColor: "divider" }}>
          <Button size="small" onClick={() => setActiveId(null)}>Back</Button>
          <Typography variant="caption">{activeId.slice(0, 8)}</Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <RemoteTerminal sessionId={activeId} onExit={() => setConnected(false)} />
        </Box>
        <TerminalToolbar connected={connected} onKey={handleKey} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Terminals</Typography>
        <Button variant="contained" size="small" onClick={handleCreate} disabled={loading}>
          New
        </Button>
      </Box>

      {loading && sessions.length === 0 && <CircularProgress sx={{ m: 2 }} />}

      <List>
        {sessions.map((s) => (
          <ListItemButton key={s.id} onClick={() => setActiveId(s.id)}>
            <ListItemText
              primary={s.label || s.command}
              secondary={s.cwd}
            />
            {s.exitCode !== undefined && (
              <Chip
                size="small"
                label={`exit ${s.exitCode}`}
                color={s.exitCode === 0 ? "success" : "error"}
              />
            )}
          </ListItemButton>
        ))}
      </List>

      {!loading && sessions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          No active terminal sessions
        </Typography>
      )}
    </Box>
  );
}
