import { useState, useEffect, useRef, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

interface LogData {
  logs: string;
  electronLogs: string;
  serverLogPath: string;
  electronLogPath: string;
}

interface LogDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function LogDrawer({ open, onClose }: LogDrawerProps) {
  const [data, setData] = useState<LogData | null>(null);
  const [tab, setTab] = useState<"server" | "electron">("server");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/electron-logs?tail=500");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // engine unavailable
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchLogs();
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, autoRefresh, fetchLogs]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [data, tab]);

  const content = tab === "server" ? data?.logs : data?.electronLogs;
  const filePath = tab === "server" ? data?.serverLogPath : data?.electronLogPath;

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 520 },
          bgcolor: "background.default",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Server Logs
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={copied ? "Copied" : "Copy logs"}>
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchLogs}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, v) => v && setTab(v)}
          size="small"
        >
          <ToggleButton value="server" sx={{ textTransform: "none", fontSize: 12, py: 0.25 }}>
            Engine
          </ToggleButton>
          <ToggleButton value="electron" sx={{ textTransform: "none", fontSize: 12, py: 0.25 }}>
            Electron
          </ToggleButton>
        </ToggleButtonGroup>
        {filePath && (
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 0.5, opacity: 0.5, fontFamily: "monospace", fontSize: 10 }}
          >
            {filePath}
          </Typography>
        )}
      </Box>

      <Box
        ref={logRef}
        component="pre"
        sx={{
          flex: 1,
          m: 0,
          px: 2,
          py: 1,
          overflow: "auto",
          fontFamily: "'SF Mono', Menlo, Consolas, monospace",
          fontSize: 11,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: "text.secondary",
          userSelect: "text",
        }}
      >
        {content || "(no logs available)"}
      </Box>
    </Drawer>
  );
}
