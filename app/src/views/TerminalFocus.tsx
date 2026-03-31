import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Box, IconButton, Typography, Chip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { TerminalPanel } from "../components/terminal/TerminalPanel";
import { SessionStateDot } from "../components/terminal/SessionStateDot";
import { useTerminalSessions } from "../hooks/useTerminalSessions";
import { useSettingsContext } from "../contexts/SettingsContext";

export default function TerminalFocus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tabs, handleExit } = useTerminalSessions();
  const { setSetting } = useSettingsContext();

  useEffect(() => {
    if (!id) return;
    setSetting("terminal.lastFocusedId", id);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.lastFocusedId": id }),
    }).catch(() => {});
  }, [id]);
  const tab = tabs.find((t) => t.id === id);

  if (!id || !tab) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Typography color="text.secondary">Session not found</Typography>
      </Box>
    );
  }

  const label = tab.label || tab.command || "Terminal";
  const resolvedState = tab.exitCode !== undefined ? "idle" as const : (tab.state ?? "running" as const);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 88px)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
        <IconButton size="small" onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <SessionStateDot state={resolvedState} size={8} />
        <Typography variant="body1" fontWeight={600} noWrap sx={{ flex: 1 }}>
          {label}
        </Typography>
        {tab.exitCode !== undefined && (
          <Chip
            size="small"
            label={tab.exitCode}
            color={tab.exitCode === 0 ? "success" : "error"}
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
      </Box>
      {tab.summary && (
        <Box sx={{
          px: 1.5, py: 0.5,
          bgcolor: "action.hover",
          borderBottom: 1,
          borderColor: "divider",
          fontSize: 12,
          color: "text.secondary",
          fontStyle: "italic",
        }}>
          {tab.summary}
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <TerminalPanel
          sessionId={tab.id}
          active
          onExit={(code) => handleExit(tab.id, code)}
        />
      </Box>
    </Box>
  );
}
