import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

interface AutoCommitStatus {
  enabled: boolean;
  lastCommit: string | null;
  lastPull: string | null;
  lastPush: string | null;
  lastPushAttempt: string | null;
  lastBuildStatus: string | null;
  currentVersion: string | null;
  saveCount: number;
  pullCount: number;
  pushCount: number;
  commitsSincePush: number;
  pushInProgress: boolean;
  commitInterval: number;
  pullInterval: number;
  pushInterval: number;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

function buildStatusColor(status: string | null): "success" | "error" | "warning" | "default" {
  if (!status) return "default";
  if (status === "ok" || status === "nothing_to_push") return "success";
  if (status === "resolving_conflicts") return "warning";
  return "error";
}

function buildStatusLabel(status: string | null): string {
  if (!status) return "no push yet";
  if (status === "ok") return "build passed";
  if (status === "nothing_to_push") return "up to date";
  if (status === "resolving_conflicts") return "resolving conflicts...";
  if (status.startsWith("failed:")) return "build failed";
  return status;
}

export function AutoCommitCard() {
  const [status, setStatus] = useState<AutoCommitStatus | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auto-commit/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* engine unreachable */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 10_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handleToggle = async () => {
    if (!status) return;
    setToggling(true);
    await fetch("/api/auto-commit/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !status.enabled }),
    });
    await fetchStatus();
    setToggling(false);
  };

  const handleCommit = async () => {
    await fetch("/api/auto-commit/commit", { method: "POST" });
    setTimeout(fetchStatus, 2000);
  };

  const handlePull = async () => {
    await fetch("/api/auto-commit/pull", { method: "POST" });
    setTimeout(fetchStatus, 3000);
  };

  const handlePush = async () => {
    await fetch("/api/auto-commit/push", { method: "POST" });
    await fetchStatus();
  };

  if (!status) {
    return (
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600}>Auto Version Control</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const bsColor = buildStatusColor(status.lastBuildStatus);

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            Auto Version Control
          </Typography>
          {status.currentVersion && (
            <Chip
              label={`v${status.currentVersion}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 20, fontWeight: 600 }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Switch
            size="small"
            checked={status.enabled}
            disabled={toggling}
            onChange={handleToggle}
          />
        </Box>

        {!status.enabled && (
          <Typography variant="caption" color="text.secondary">
            Disabled -- enable for auto-commit (30s), auto-pull (5m), AI-squash + version bump + push (30m)
          </Typography>
        )}

        <Stack spacing={0.75}>
          {/* Commit row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SaveIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ minWidth: 90 }}>
              Commit
            </Typography>
            {status.enabled && (
              <Chip
                label={`every ${status.commitInterval}s`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18 }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {status.saveCount} saved
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {timeAgo(status.lastCommit)}
            </Typography>
            <Tooltip title="Commit now">
              <IconButton size="small" onClick={handleCommit} sx={{ p: 0.25 }}>
                <PlayArrowIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Pull row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudDownloadIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ minWidth: 90 }}>
              Pull
            </Typography>
            {status.enabled && (
              <Chip
                label={`every ${Math.round(status.pullInterval / 60)}m`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18 }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {status.pullCount} pulled
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {timeAgo(status.lastPull)}
            </Typography>
            <Tooltip title="Pull now">
              <IconButton size="small" onClick={handlePull} sx={{ p: 0.25 }}>
                <PlayArrowIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Push row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudUploadIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ minWidth: 90 }}>
              AI Squash + Push
            </Typography>
            {status.enabled && (
              <Chip
                label={`every ${Math.round(status.pushInterval / 60)}m`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18 }}
              />
            )}
            <Chip
              label={buildStatusLabel(status.lastBuildStatus)}
              size="small"
              color={bsColor}
              icon={bsColor === "success" ? <CheckCircleIcon /> : bsColor === "error" ? <ErrorIcon /> : undefined}
              sx={{ fontSize: "0.6rem", height: 18 }}
            />
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {timeAgo(status.lastPush)}
            </Typography>
            <Tooltip title="Squash, bump version & push now">
              <IconButton
                size="small"
                onClick={handlePush}
                disabled={status.pushInProgress}
                sx={{ p: 0.25 }}
              >
                <PlayArrowIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Pending commits indicator */}
          {status.commitsSincePush > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
              {status.commitsSincePush} commit{status.commitsSincePush !== 1 ? "s" : ""} will be squashed on next push
            </Typography>
          )}

          {/* Push in progress */}
          {status.pushInProgress && (
            <Box>
              <Typography variant="caption" color="primary">
                Build check, AI squash, version bump + push in progress...
              </Typography>
              <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
