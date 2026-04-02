import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import LinearProgress from "@mui/material/LinearProgress";
import Collapse from "@mui/material/Collapse";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAutoresearch } from "../hooks/useAutoresearch";
import { api } from "../lib/api";

const PHASE_LABELS: Record<string, string> = {
  idle: "Ready -- waiting to run next experiment",
  analyzing: "Scanning sessions for improvement targets...",
  selecting: "Picking the best candidate...",
  snapshotting: "Saving current files for safe rollback...",
  modifying: "An agent is rewriting the target file...",
  evaluating: "Testing if the change actually improved things...",
  pending_approval: "Waiting for your approval on a skill/rule change",
  not_running: "Not running",
};

export default function Autoresearch() {
  const { status, history, candidates, loading, busy, error, lastEval, actions } = useAutoresearch();
  const [evalMode, setEvalMode] = useState(status?.eval_backend ?? "keywords");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync local dropdown with worker backend when status loads
  const workerBackend = status?.eval_backend;
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (workerBackend && !synced) {
      setEvalMode(workerBackend);
      setSynced(true);
    }
  }, [workerBackend, synced]);

  const handleBackendChange = (value: string) => {
    setEvalMode(value);
    api.autoresearchSetBackend(value).then(() => actions.reload());
  };

  if (loading && !status) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  const phase = status?.phase ?? "not_running";
  const isActive = phase !== "not_running" && phase !== "idle";
  const isOff = phase === "not_running";

  return (
    <Box sx={{ p: 2, maxWidth: 1200 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Autoresearch</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Automatically improves your skills, rules, and routing tree by analyzing
        past sessions, making targeted changes, testing them, and keeping what works.
      </Typography>

      {/* Error banner */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={actions.clearError}>
          {error}
        </Alert>
      )}

      {/* Live status */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StatusDot phase={phase} />
              <Typography variant="body1">
                {PHASE_LABELS[phase] ?? phase}
              </Typography>
            </Stack>

            {isOff || phase === "idle" ? (
              <Button
                variant="contained"
                onClick={() => actions.start(evalMode)}
                disabled={busy === "starting"}
                startIcon={busy === "starting" ? <CircularProgress size={16} /> : undefined}
              >
                {busy === "starting" ? "Starting..." : "Start improving"}
              </Button>
            ) : (
              <Button
                variant="outlined" color="error"
                onClick={actions.stop}
                disabled={busy === "stopping"}
              >
                {busy === "stopping" ? "Stopping..." : "Stop"}
              </Button>
            )}
          </Stack>

          {/* Active experiment detail panel */}
          {isActive && status?.target_name && (
            <Box sx={{
              mt: 1.5, p: 1.5, borderRadius: 1,
              bgcolor: "action.hover",
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack spacing={0.25}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TypeChip type={status.experiment_type ?? "tree"} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {status.target_name}
                    </Typography>
                    <Elapsed phase={phase} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {activeDescription(phase, status)}
                  </Typography>
                </Stack>
                {status.active_session && phase === "modifying" && (
                  <Button
                    variant="outlined" size="small"
                    href={`/?terminal=${status.active_session}`}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    Watch agent
                  </Button>
                )}
              </Stack>
            </Box>
          )}

          {isActive && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}

          {isOff && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Start improving" to enable the autoresearch loop. It will
              analyze your sessions, find the weakest skill/rule/tree node,
              dispatch an agent to improve it, test the change, and keep or
              revert it. Runs every 15 minutes while enabled.
            </Typography>
          )}

          <Stack direction="row" spacing={4} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Stat label="Eval backend" value={backendLabel(evalMode)} />
            {(status?.experiment_count ?? 0) > 0 && (
              <>
                <Stat label="Experiments run" value={String(status?.experiment_count ?? 0)} />
                <Stat label="Baseline score" value={fmt(status?.baseline_score)} />
                <Stat label="Latest score" value={fmt(status?.current_score ?? status?.latest_score)} />
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* What it plans to improve next */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            What to improve next
          </Typography>
          {candidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No improvement targets found yet. Start the system to analyze your sessions.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>What</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Why</TableCell>
                    <TableCell align="right">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={`${c.type}:${c.target}`}>
                      <TableCell><TypeChip type={c.type} /></TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{c.target}</TableCell>
                      <TableCell sx={{ maxWidth: 420, whiteSpace: "normal" }}>
                        {c.rationale}
                      </TableCell>
                      <TableCell align="right">
                        <PriorityBar value={c.priority} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            When running, the system picks the highest-confidence target automatically.
            Skill and rule changes require your approval before they are kept.
          </Typography>
        </CardContent>
      </Card>

      {/* Past experiments */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Past experiments
          </Typography>
          {history.length === 0 ? (
            <Alert severity="info" variant="outlined">
              No experiments yet. Start the system above to run the first one.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>What</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell><TypeChip type={exp.experiment_type ?? "tree"} /></TableCell>
                      <TableCell>{exp.target_name ?? "tree.py"}</TableCell>
                      <TableCell align="right">{fmt(exp.retrieval_score)}</TableCell>
                      <TableCell align="right" sx={{ color: deltaColor(exp.delta) }}>
                        {fmtDelta(exp.delta)}
                      </TableCell>
                      <TableCell><DecisionChip decision={exp.decision} /></TableCell>
                      <TableCell>{fmtDate(exp.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Advanced settings */}
      <Card>
        <CardContent sx={{ "&:last-child": { pb: 1.5 } }}>
          <Stack
            direction="row" alignItems="center" spacing={1}
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{ cursor: "pointer" }}
          >
            <Typography variant="body2" color="text.secondary">Advanced</Typography>
            <IconButton size="small">
              <ExpandMoreIcon sx={{
                transform: showAdvanced ? "rotate(180deg)" : "none",
                transition: "0.2s",
              }} />
            </IconButton>
          </Stack>
          <Collapse in={showAdvanced}>
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Evaluation method
                  </Typography>
                  <Select
                    size="small" value={evalMode}
                    onChange={(e) => handleBackendChange(e.target.value)}
                    sx={{ ml: 1, minWidth: 160 }}
                  >
                    <MenuItem value="keywords">Local (fast, free)</MenuItem>
                    <MenuItem value="ollama">Ollama (local GPU)</MenuItem>
                    <MenuItem value="gpu">Vertex AI GPU (accurate, costs $)</MenuItem>
                  </Select>
                </Box>
                <Button
                  variant="outlined" size="small"
                  onClick={() => actions.evaluate(evalMode)}
                  disabled={busy === "evaluating" || isActive}
                  startIcon={busy === "evaluating" ? <CircularProgress size={14} /> : undefined}
                >
                  {busy === "evaluating" ? "Running evaluation..." : "Score current tree"}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                "Score current tree" runs the evaluation harness (prepare.py) against your
                current tree.py without modifying anything. Useful for checking the
                baseline before starting experiments.
              </Typography>

              {/* Inline eval result */}
              {lastEval && (
                <Alert severity={lastEval.ok ? "success" : "error"} variant="outlined">
                  {lastEval.ok
                    ? `Score: ${fmt(lastEval.retrieval_score)} | Accuracy: ${fmt(lastEval.accuracy)} | Leaves: ${lastEval.leaves}`
                    : `Evaluation failed: ${lastEval.error}`}
                </Alert>
              )}
            </Stack>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
}

function Elapsed({ phase }: { phase: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      if (spanRef.current) {
        const total = Math.floor((Date.now() - startRef.current) / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        spanRef.current.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
      <span ref={spanRef}>0s</span>
    </Typography>
  );
}

function StatusDot({ phase }: { phase: string }) {
  const color =
    phase === "not_running" ? "text.disabled" :
    phase === "idle" ? "success.main" :
    "warning.main";
  return (
    <Box sx={{
      width: 10, height: 10, borderRadius: "50%",
      bgcolor: color, flexShrink: 0,
    }} />
  );
}

function TypeChip({ type }: { type: string }) {
  const colors: Record<string, "primary" | "secondary" | "default"> = {
    tree: "primary", skill: "secondary", rule: "default",
  };
  return <Chip label={type} size="small" color={colors[type] ?? "default"} />;
}

function DecisionChip({ decision }: { decision: string | null | undefined }) {
  if (!decision) return <Typography variant="body2">-</Typography>;
  const map: Record<string, { label: string; color: "success" | "error" | "warning" | "default" }> = {
    keep: { label: "Kept", color: "success" },
    revert: { label: "Reverted", color: "error" },
    pending_approval: { label: "Needs approval", color: "warning" },
  };
  const info = map[decision] ?? { label: decision, color: "default" as const };
  return <Chip label={info.label} size="small" color={info.color} />;
}

function PriorityBar({ value }: { value: number }) {
  const pct = Math.min(value / 10, 1) * 100;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box sx={{
        width: 60, height: 6, bgcolor: "action.hover",
        borderRadius: 3, overflow: "hidden",
      }}>
        <Box sx={{
          width: `${pct}%`, height: "100%",
          bgcolor: "primary.main", borderRadius: 3,
        }} />
      </Box>
      <Typography variant="caption">{value.toFixed(1)}</Typography>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Box>
  );
}

function activeDescription(phase: string, status: { experiment_type?: string; target_name?: string | null; session_state?: string; session_label?: string } | null): string {
  if (!status) return PHASE_LABELS[phase] ?? phase;
  const target = status.target_name ?? "";
  const type = status.experiment_type ?? "tree";
  const ss = status.session_state;

  if (phase === "modifying") {
    const path = type === "skill" ? `skills/${target}/SKILL.md` :
                 type === "rule" ? `rules/${target}.md` : "tree.py";
    const stateLabel = ss === "running" ? "actively writing" :
                       ss === "waiting" ? "finished, waiting to exit" :
                       ss === "idle" ? "idle" : ss ?? "spawning";
    return `Agent editing ${path} -- session: ${stateLabel}`;
  }
  if (phase === "evaluating") {
    return `Measuring if the change to ${target} improved things...`;
  }
  return PHASE_LABELS[phase] ?? phase;
}

function backendLabel(backend: string | undefined): string {
  if (!backend) return "Local";
  const labels: Record<string, string> = {
    keywords: "Local (keywords)",
    ollama: "Ollama (local GPU)",
    gpu: "Vertex AI GPU",
    transformers: "Vertex AI GPU",
  };
  return labels[backend] ?? backend;
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "-";
  return (v * 100).toFixed(1) + "%";
}

function fmtDelta(v: number | null | undefined): string {
  if (v == null) return "-";
  const sign = v >= 0 ? "+" : "";
  return sign + (v * 100).toFixed(2) + "%";
}

function deltaColor(v: number | null | undefined): string {
  if (v == null) return "inherit";
  return v > 0 ? "success.main" : v < 0 ? "error.main" : "inherit";
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}
