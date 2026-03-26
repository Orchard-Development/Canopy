import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, Typography, Stack, Chip, Button,
  CircularProgress, Collapse, Box, LinearProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { api } from "../../lib/api";

interface ReadinessCheck {
  field: string;
  ok: boolean;
  detail: string;
}

interface ReadinessStatus {
  status: "ready" | "fixing" | "error" | "unchecked";
  installed: boolean;
  version: string | null;
  checks: ReadinessCheck[];
  issues: string[];
  fixes: string[];
  lastCheck: string | null;
  lastProbe: string | null;
  probeOutput: string | null;
  probeVerdict: string | null;
}

function StatusChip({ status }: { status: ReadinessStatus["status"] }) {
  const map = {
    ready: { label: "Ready", color: "success" as const, icon: <CheckCircleIcon /> },
    fixing: { label: "Auto-fixing", color: "warning" as const, icon: <WarningIcon /> },
    error: { label: "Error", color: "error" as const, icon: <ErrorIcon /> },
    unchecked: { label: "Checking...", color: "default" as const, icon: undefined },
  };
  const entry = map[status as keyof typeof map] ?? { label: status ?? "Unknown", color: "default" as const, icon: undefined };
  return <Chip label={entry.label} size="small" color={entry.color} variant="outlined" icon={entry.icon} />;
}

function CheckLine({ check }: { check: ReadinessCheck }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.25 }}>
      {check.ok
        ? <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
        : <WarningIcon color="warning" sx={{ fontSize: 16 }} />
      }
      <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
        {check.field}
      </Typography>
      <Typography variant="caption" color="text.secondary">{check.detail}</Typography>
    </Stack>
  );
}

export function ClaudeReadinessCard() {
  const [status, setStatus] = useState<ReadinessStatus | null>(null);
  const [probing, setProbing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await api.claudeReadiness();
      setStatus(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function probe() {
    setProbing(true);
    try {
      const s = await api.claudeReadinessProbe();
      setStatus(s);
    } catch { /* ignore */ }
    setProbing(false);
  }

  const checks = status?.checks ?? [];
  const fixes = status?.fixes ?? [];
  const allOk = checks.every((c) => c.ok);
  const failedChecks = checks.filter((c) => !c.ok);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Claude Code Readiness</Typography>
          {status ? <StatusChip status={status.status} /> : <CircularProgress size={20} />}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Checks every 30s that Claude Code is configured for non-interactive use.
          Auto-fixes onboarding, theme, trust, and auth issues.
        </Typography>

        {status && (
          <>
            {/* Version line */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              {status.installed
                ? <CheckCircleIcon color="success" fontSize="small" />
                : <ErrorIcon color="error" fontSize="small" />
              }
              <Typography variant="body2">
                {status.installed ? `claude ${status.version}` : "Claude Code not installed"}
              </Typography>
            </Stack>

            {/* Quick summary of failures */}
            {failedChecks.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {failedChecks.map((c) => <CheckLine key={c.field} check={c} />)}
              </Box>
            )}

            {/* Fixes applied */}
            {fixes.length > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: "block", mb: 1 }}>
                {fixes[fixes.length - 1]}
              </Typography>
            )}

            {/* Probe result */}
            {status.lastProbe && status.probeVerdict && (
              <Box sx={{
                mt: 1, p: 1, borderRadius: 1,
                border: 1,
                borderColor: status.probeVerdict.includes("successfully") ? "success.main" : "warning.main",
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Probe ({new Date(status.lastProbe).toLocaleTimeString()}):{" "}
                  <Typography component="span" variant="caption"
                    color={status.probeVerdict.includes("successfully") ? "success.main" : "warning.main"}>
                    {status.probeVerdict}
                  </Typography>
                </Typography>
              </Box>
            )}

            {/* Expand all checks */}
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mt: 1, textTransform: "none" }}
            >
              {expanded ? "Hide" : "Show"} all checks ({checks.length})
            </Button>
            <Collapse in={expanded}>
              <Box sx={{ mt: 0.5 }}>
                {checks.map((c) => <CheckLine key={c.field} check={c} />)}
              </Box>
            </Collapse>
          </>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={probing ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
            onClick={probe}
            disabled={probing}
          >
            {probing ? "Probing..." : "Run Probe Now"}
          </Button>
        </Stack>

        {probing && <LinearProgress sx={{ mt: 1 }} />}

        {status?.lastCheck && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Last check: {new Date(status.lastCheck).toLocaleTimeString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
