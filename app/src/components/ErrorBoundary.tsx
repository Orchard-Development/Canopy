import { Component, Fragment, type ReactNode } from "react";
import {
  Box, Typography, IconButton, Tooltip, Paper, LinearProgress, alpha,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import TerminalIcon from "@mui/icons-material/Terminal";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ReplayIcon from "@mui/icons-material/Replay";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import { CheckpointPicker } from "./CheckpointPicker";
import { api } from "../lib/api";
import { requestTerminalOpen } from "../hooks/useDispatch";

interface Props {
  children: ReactNode;
  /** Label shown in the crash screen so the user knows which view broke. */
  label?: string;
}

const RETRY_INTERVAL_S = 3;
const MAX_RETRIES = 10;

interface State {
  hasError: boolean;
  dismissed: boolean;
  dispatched: boolean;
  error: Error | null;
  errorInfo: { componentStack?: string | null } | null;
  retryCount: number;
  /** Countdown seconds until next retry (3, 2, 1, 0) */
  countdown: number;
  copied: boolean;
}

/**
 * Catches render crashes from broken hot-reloads and shows a recovery screen.
 * Automatically retries every 3s in case HMR pushes a fix while the user waits.
 */
export class ErrorBoundary extends Component<Props, State> {
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false, dismissed: false, dispatched: false,
      error: null, errorInfo: null, retryCount: 0,
      countdown: RETRY_INTERVAL_S, copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, info: React.ErrorInfo) {
    this.setState({ errorInfo: info, countdown: RETRY_INTERVAL_S });
    this.startCountdown();
  }

  componentWillUnmount() {
    this.stopCountdown();
  }

  private startCountdown() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      this.setState((prev) => {
        const next = prev.countdown - 1;
        if (next > 0) return { ...prev, countdown: next };
        // Countdown hit 0 -- trigger retry or stop
        if (prev.retryCount >= MAX_RETRIES) {
          this.stopCountdown();
          return { ...prev, countdown: 0 };
        }
        return {
          ...prev,
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
          countdown: RETRY_INTERVAL_S,
          copied: false,
        };
      });
    }, 1000);
  }

  private stopCountdown() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  handleReload = () => window.location.reload();

  handleRetry = () => {
    this.stopCountdown();
    this.setState({
      hasError: false, dismissed: false, error: null,
      errorInfo: null, countdown: RETRY_INTERVAL_S, copied: false,
    });
  };

  handleDismiss = () => {
    this.stopCountdown();
    this.setState({ dismissed: true });
  };

  handleCopy = () => {
    const { error, errorInfo } = this.state;
    const text = [
      error?.message ?? "Unknown error",
      errorInfo?.componentStack ? `\nComponent stack:${errorInfo.componentStack}` : "",
    ].join("");
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  handleDispatchFix = async () => {
    const { error, errorInfo } = this.state;
    const label = this.props.label ?? "View";
    const prompt = [
      `The UI component "${label}" crashed with the following error. Find and fix the bug in the source code.`,
      "",
      `Error: ${error?.message ?? "Unknown error"}`,
      errorInfo?.componentStack ? `\nComponent stack:${errorInfo.componentStack}` : "",
    ].join("\n");

    this.setState({ dispatched: true, dismissed: true });
    this.stopCountdown();
    try {
      let projectId: string | undefined;
      try {
        const settings = await fetch("/api/settings").then((r) => r.json());
        projectId = settings?.active_project;
      } catch { /* proceed without project context */ }
      const result = await api.spawnTerminal("claude", [prompt], undefined, projectId);
      requestTerminalOpen(result.id, `Fix: ${label}`);
    } catch {
      // Terminal spawn failed -- user still sees the dismissed banner
    }
  };

  renderDismissedBanner() {
    const label = this.props.label ?? "View";
    return (
      <Box sx={{ p: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2, py: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderColor: "warning.main",
          }}
        >
          <BuildCircleIcon sx={{ color: "warning.main", fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {`"${label}" crashed -- waiting for hot reload`}
            {this.state.retryCount > 0 && ` (retry ${this.state.retryCount}/${MAX_RETRIES})`}
          </Typography>
          <Tooltip title="Retry now"><IconButton size="small" onClick={this.handleRetry}><ReplayIcon fontSize="small" /></IconButton></Tooltip>
          {!this.state.dispatched && (
            <Tooltip title="Dispatch fix agent">
              <IconButton size="small" color="warning" onClick={this.handleDispatchFix}>
                <TerminalIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Full reload"><IconButton size="small" onClick={this.handleReload}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
        </Paper>
      </Box>
    );
  }

  renderCrashScreen() {
    const { retryCount, countdown, error, errorInfo, dispatched, copied } = this.state;
    const stopped = retryCount >= MAX_RETRIES;
    const progress = stopped ? 100 : ((RETRY_INTERVAL_S - countdown) / RETRY_INTERVAL_S) * 100;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 440,
            width: "100%",
            p: 4,
            textAlign: "center",
            border: 1,
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <BuildCircleIcon sx={{ fontSize: 48, color: "warning.main", mb: 1.5 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {this.props.label ? `"${this.props.label}" crashed` : "View crashed"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            An agent is probably editing code right now. The fix will land via hot reload automatically.
          </Typography>

          {/* Countdown progress */}
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {stopped
                  ? `Stopped after ${MAX_RETRIES} attempts`
                  : `Attempt ${retryCount + 1}/${MAX_RETRIES}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {stopped ? "" : `${countdown}s`}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={(t) => ({
                height: 4,
                borderRadius: 2,
                bgcolor: alpha(t.palette.warning.main, 0.12),
                "& .MuiLinearProgress-bar": {
                  bgcolor: "warning.main",
                  borderRadius: 2,
                  transition: stopped ? "none" : "transform 1s linear",
                },
              })}
            />
          </Box>

          {/* Error detail */}
          {error && (
            <Paper
              variant="outlined"
              sx={{
                bgcolor: "background.default",
                color: "error.light",
                p: 1.5,
                mb: 2.5,
                maxHeight: 160,
                overflow: "auto",
                textAlign: "left",
                position: "relative",
              }}
            >
              <Box sx={{ position: "absolute", top: 4, right: 4 }}>
                <Tooltip title={copied ? "Copied" : "Copy error"}>
                  <IconButton size="small" onClick={this.handleCopy} sx={{ color: "text.secondary" }}>
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="caption"
                component="pre"
                sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", m: 0, pr: 3 }}
              >
                {error.message}
                {errorInfo?.componentStack && (
                  `\n\nComponent stack:${errorInfo.componentStack}`
                )}
              </Typography>
            </Paper>
          )}

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
            <Tooltip title="Dismiss">
              <IconButton onClick={this.handleDismiss} sx={{ color: "text.secondary" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Retry now">
              <IconButton onClick={this.handleRetry} color="primary">
                <ReplayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={dispatched ? "Fix dispatched" : "Dispatch fix agent"}>
              <span>
                <IconButton
                  onClick={this.handleDispatchFix}
                  disabled={dispatched}
                  color="warning"
                >
                  <TerminalIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Full reload">
              <IconButton onClick={this.handleReload} color="primary">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <CheckpointPicker onRestored={this.handleReload} />
        </Paper>
      </Box>
    );
  }

  render() {
    if (this.state.hasError && this.state.dismissed) {
      return this.renderDismissedBanner();
    }
    if (this.state.hasError) {
      return this.renderCrashScreen();
    }

    // Key forces full remount on retry, clearing corrupted hook state from HMR
    return <Fragment key={this.state.retryCount}>{this.props.children}</Fragment>;
  }
}
