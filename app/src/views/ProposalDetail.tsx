import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Alert,
  Skeleton,
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  Collapse,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import TerminalIcon from "@mui/icons-material/Terminal";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { MarkdownContent } from "../components/MarkdownContent";
import { useChannelEvent } from "../hooks/useChannelEvent";
import { useDashboardChannel } from "../hooks/useDashboardChannel";
import { EVENTS } from "../lib/events";
import { useActiveProject } from "../hooks/useActiveProject";
import { api } from "../lib/api";
import { requestTerminalOpen } from "../hooks/useDispatch";
import { TasksTab } from "./proposal/TasksTab";
import { STATUS_ACCENT } from "./proposal/types";
import type { Proposal, TaskFile } from "./proposal/types";

export default function ProposalDetailView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const projectId = project?.id;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [selectedTask, setSelectedTask] = useState<TaskFile | null>(null);
  const didAutoSelect = useRef(false);
  const [busy, setBusy] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const { channel } = useDashboardChannel();
  const evalEvent = useChannelEvent<{ slug: string; text: string }>(channel, EVENTS.proposals.eval);
  const evalDoneEvent = useChannelEvent<{ slug: string; error?: string }>(channel, EVENTS.proposals.evalDone);
  const changedEvent = useChannelEvent<{ data: { slug?: string } }>(channel, EVENTS.proposals.changed);
  const createdEvent = useChannelEvent<{ data: Record<string, unknown> }>(channel, EVENTS.proposals.created);

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    api.getProposal(slug, projectId ?? undefined)
      .then(setProposal)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [slug, projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (proposal?.tasks?.length && !didAutoSelect.current) {
      setSelectedTask(proposal.tasks[0]);
      didAutoSelect.current = true;
    }
  }, [proposal]);

  // Refetch when proposal or its tasks change
  useEffect(() => {
    if (!changedEvent) return;
    const changedSlug = changedEvent.data?.slug ?? (changedEvent as any).slug;
    if (changedSlug && changedSlug !== slug) return;
    load();
  }, [changedEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!createdEvent) return;
    load();
  }, [createdEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle streaming eval text from Phoenix channel
  useEffect(() => {
    if (!evalEvent || evalEvent.slug !== slug || !evaluating) return;
    setEvaluation((prev) => (prev ?? "") + evalEvent.text);
  }, [evalEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle eval done from Phoenix channel
  useEffect(() => {
    if (!evalDoneEvent || evalDoneEvent.slug !== slug || !evaluating) return;
    if (evalDoneEvent.error) setError(evalDoneEvent.error);
    setEvaluating(false);
  }, [evalDoneEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Box sx={{ pt: 3, maxWidth: 960, mx: "auto" }}>
        <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  if (error || !proposal) {
    return (
      <Box sx={{ pt: 3, maxWidth: 960, mx: "auto" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/proposals")} sx={{ mb: 2 }}>Back</Button>
        <Alert severity="error">{error ?? "Proposal not found"}</Alert>
      </Box>
    );
  }

  const progress = proposal.taskCount > 0
    ? Math.round(((proposal.tasksByStatus?.completed ?? 0) / proposal.taskCount) * 100)
    : 0;

  async function dispatchAction(action: "build" | "edit", taskId?: string) {
    if (!slug) return;
    setBusy(true);
    try {
      const opts: { task?: string; projectId?: string } = {};
      if (taskId) opts.task = taskId;
      if (projectId) opts.projectId = projectId;
      const hasOpts = Object.keys(opts).length > 0;
      const result = action === "build"
        ? await api.buildProposal(slug, hasOpts ? opts : undefined)
        : await api.editProposal(slug, hasOpts ? opts : undefined);
      const verb = action === "build" ? "Building" : "Editing";
      navigate(`/terminal?session=${result.sessionId}&label=${taskId ? `${verb}: ${slug} (task ${taskId})` : `${verb}: ${slug}`}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const handleBuild = (taskId?: string) => dispatchAction("build", taskId);
  const handleEdit = (taskId?: string) => dispatchAction("edit", taskId);

  async function handleEvaluate() {
    if (!slug) return;
    setEvaluating(true);
    setEvaluation("");
    try {
      await api.evaluateProposal(slug, projectId ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEvaluating(false);
    }
  }

  async function handleSetStatus(status: string) {
    if (!slug) return;
    setBusy(true);
    try { await api.setProposalStatus(slug, status, projectId ?? undefined); load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!slug || !proposal || !window.confirm(`Delete proposal "${proposal.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try { await api.deleteProposal(slug, projectId ?? undefined); navigate("/proposals"); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  }

  return (
    <Box sx={{ pt: 2, maxWidth: 960, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/proposals")} size="small" sx={{ mb: 1 }}>Back</Button>

      <Box sx={{ mb: 1, pl: 2, borderLeft: 4, borderLeftColor: STATUS_ACCENT[proposal.status] ?? "grey.500" }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>{proposal.title}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {proposal.repo && <Chip label={proposal.repo} size="small" variant="outlined" />}
          {proposal.date && <Typography variant="caption" color="text.secondary">{proposal.date}</Typography>}
          <Tooltip title="Have AI re-evaluate if this proposal is still needed">
            <Button variant="outlined" size="small" startIcon={evaluating ? <CircularProgress size={16} /> : <FactCheckIcon />} onClick={handleEvaluate} disabled={busy || evaluating}>
              {evaluating ? "Evaluating..." : "Evaluate"}
            </Button>
          </Tooltip>
          <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => handleEdit()} disabled={busy}>Edit</Button>
          <Button variant="contained" size="small" startIcon={<RocketLaunchIcon />} onClick={() => handleBuild()} disabled={busy || proposal.status === "completed"}>Build</Button>
          <Tooltip title="Delete this proposal permanently">
            <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={busy}>Delete</Button>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{proposal.tasksByStatus?.completed ?? 0} / {proposal.taskCount} tasks completed</Typography>
          <Typography variant="caption" color="text.secondary">{progress}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      {(proposal.sessions?.length ?? 0) > 0 && (
        <SessionLinks sessions={proposal.sessions!} navigate={navigate} />
      )}

      <Collapse in={evaluation !== null}>
        <EvaluationPanel evaluation={evaluation} evaluating={evaluating} onDismiss={() => setEvaluation(null)} onSetStatus={handleSetStatus} onDelete={handleDelete} />
      </Collapse>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Design" />
        <Tab label={`Tasks (${proposal.taskCount})`} />
        <Tab label="Impact" disabled={!proposal.impact} />
      </Tabs>

      {tab === 0 && <Paper variant="outlined" sx={{ p: 3 }}><MarkdownContent content={proposal.proposal} /></Paper>}
      {tab === 1 && <TasksTab tasks={proposal.tasks} selected={selectedTask} onSelect={setSelectedTask} onBuild={handleBuild} onEdit={handleEdit} busy={busy} />}
      {tab === 2 && proposal.impact && <Paper variant="outlined" sx={{ p: 3 }}><MarkdownContent content={proposal.impact} /></Paper>}
    </Box>
  );
}

function SessionLinks({ sessions, navigate }: {
  sessions: Array<{ id: string; action: string; task: string | null; agent: string; timestamp: string }>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const actionLabel = (action: string) => {
    const labels: Record<string, string> = { create: "Create", build: "Build", edit: "Edit" };
    return labels[action] ?? action;
  };

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: "block" }}>
        Linked Sessions
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {sessions.map((s) => (
          <Chip
            key={s.id}
            label={`${actionLabel(s.action)}${s.task ? ` #${s.task}` : ""} (${s.agent})`}
            size="small"
            variant="outlined"
            icon={<TerminalIcon />}
            onClick={() => requestTerminalOpen(s.id, `Proposal: ${s.action}`)}
            onDelete={() => navigate(`/sessions/${s.id}`)}
            deleteIcon={
              <Tooltip title="View session log">
                <ArticleOutlinedIcon sx={{ fontSize: 14 }} />
              </Tooltip>
            }
          />
        ))}
      </Stack>
    </Paper>
  );
}

function EvaluationPanel({ evaluation, evaluating, onDismiss, onSetStatus, onDelete }: {
  evaluation: string | null; evaluating: boolean; onDismiss: () => void; onSetStatus: (s: string) => void; onDelete: () => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: "info.main", borderLeft: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2">AI Evaluation</Typography>
          {evaluating && <CircularProgress size={14} />}
        </Stack>
        <Button size="small" onClick={onDismiss} disabled={evaluating}>Dismiss</Button>
      </Stack>
      {evaluation ? <MarkdownContent content={evaluation} /> : evaluating ? <Typography variant="body2" color="text.secondary">Thinking...</Typography> : null}
      {!evaluating && evaluation && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Button size="small" variant="outlined" color="success" onClick={() => onSetStatus("completed")}>Mark Completed</Button>
          <Button size="small" variant="outlined" color="error" onClick={() => onSetStatus("rejected")}>Reject</Button>
          <Button size="small" variant="outlined" color="error" onClick={onDelete}>Delete</Button>
        </Stack>
      )}
    </Paper>
  );
}
