import { useState, useEffect, useCallback } from "react";
import {
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

interface TunnelStatus {
  status: string;
  url: string | null;
  error: string | null;
}

export function TunnelChip() {
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tunnel/status");
      setTunnel(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Poll faster while starting
  useEffect(() => {
    if (tunnel?.status !== "starting") return;
    const id = setInterval(refresh, 2_000);
    return () => clearInterval(id);
  }, [tunnel?.status, refresh]);

  if (!tunnel || tunnel.status === "stopped" || tunnel.status === "disabled") return null;

  if (tunnel.status === "starting") {
    return (
      <Chip
        size="small"
        variant="outlined"
        color="info"
        icon={<CircularProgress size={10} />}
        label="Tunnel starting"
        sx={{ height: 22, fontSize: 11 }}
      />
    );
  }

  if (tunnel.status === "error") {
    return (
      <Tooltip title={tunnel.error || "Tunnel error"}>
        <Chip
          size="small"
          variant="outlined"
          color="error"
          icon={<PublicIcon sx={{ fontSize: "14px !important" }} />}
          label="Tunnel error"
          sx={{ height: 22, fontSize: 11 }}
        />
      </Tooltip>
    );
  }

  const shortUrl = tunnel.url?.replace(/^https?:\/\//, "") ?? "Tunnel";

  function copyUrl() {
    if (tunnel?.url) navigator.clipboard.writeText(tunnel.url);
  }

  return (
    <Tooltip title="Click to copy tunnel URL">
      <Chip
        size="small"
        variant="outlined"
        color="success"
        icon={<PublicIcon sx={{ fontSize: "14px !important" }} />}
        deleteIcon={<ContentCopyIcon sx={{ fontSize: "14px !important" }} />}
        onDelete={copyUrl}
        onClick={copyUrl}
        label={shortUrl}
        sx={{ height: 22, fontSize: 11, cursor: "pointer", maxWidth: 260 }}
      />
    </Tooltip>
  );
}
