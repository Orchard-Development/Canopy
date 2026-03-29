import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Skeleton,
  Tooltip,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RepeatIcon from "@mui/icons-material/Repeat";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TerminalIcon from "@mui/icons-material/Terminal";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { PageLayout } from "../components/PageLayout";
import {
  useScheduledTasks,
  type ScheduledTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "../hooks/useScheduledTasks";

const STATUS_COLORS: Record<string, "default" | "info" | "success" | "warning" | "error"> = {
  pending: "info",
  active: "success",
  completed: "default",
  failed: "error",
};

const STATUS_BORDER: Record<string, string> = {
  pending: "#0288d1",
  active: "#2e7d32",
  completed: "#9e9e9e",
  failed: "#d32f2f",
};

const ACTION_TYPE_META: Record<string, { label: string; color: "primary" | "secondary" | "warning" | "info"; icon: React.ReactNode }> = {
  spawn: { label: "AI Agent", color: "primary", icon: <AutoAwesomeIcon sx={{ fontSize: 12 }} /> },
  script: { label: "Shell Script", color: "secondary", icon: <TerminalIcon sx={{ fontSize: 12 }} /> },
  reminder: { label: "Reminder", color: "warning", icon: <NotificationsIcon sx={{ fontSize: 12 }} /> },
  notify: { label: "Notify", color: "info", icon: <NotificationsIcon sx={{ fontSize: 12 }} /> },
};

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day 9am", value: "0 9 * * *" },
  { label: "Weekdays 9am", value: "0 9 * * 1-5" },
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Every Mon 9am", value: "0 9 * * 1" },
];

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, month, dow] = parts;
  if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "Every minute";
  if (/^\*\/\d+$/.test(min) && hour === "*" && dom === "*" && month === "*" && dow === "*")
    return `Every ${min.slice(2)} minutes`;
  if (min === "0" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "Every hour";
  if (/^\*\/\d+$/.test(hour) && dom === "*" && month === "*" && dow === "*")
    return `Every ${hour.slice(2)} hours`;
  const h = parseInt(hour), m = parseInt(min);
  if (!isNaN(h) && !isNaN(m) && dom === "*" && month === "*") {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const time = `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    if (dow === "*") return `Daily at ${time}`;
    if (dow === "1-5") return `Weekdays at ${time}`;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayNum = parseInt(dow);
    if (!isNaN(dayNum) && dayNames[dayNum]) return `${dayNames[dayNum]}s at ${time}`;
  }
  return expr;
}

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const future = diff > 0;
  if (abs < 60_000) return future ? "in a moment" : "just now";
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return future ? `in ${m}m` : `${m}m ago`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return future ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(abs / 86_400_000);
  return future ? `in ${d}d` : `${d}d ago`;
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: "block", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: 0.6, color: "text.disabled", mb: 0.25 }}
    >
      {children}
    </Typography>
  );
}

function TaskCard({
  task,
  busy,
  onToggle,
  onDelete,
  onTrigger,
  onEdit,
}: {
  task: ScheduledTask;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onTrigger: () => void;
  onEdit: () => void;
}) {
  const navigate = useNavigate();
  const prompt = typeof task.payload?.prompt === "string" ? task.payload.prompt : null;
  const script = typeof task.payload?.script === "string" ? task.payload.script : null;
  const originConvId =
    task.payload?.origin === "chat" && typeof task.payload?.origin_id === "string"
      ? task.payload.origin_id
      : null;
  const body = prompt ?? script;
  const actionMeta = ACTION_TYPE_META[task.action_type] ?? ACTION_TYPE_META.spawn;

  return (
    <Card
      variant="outlined"
      sx={{
        opacity: task.enabled ? 1 : 0.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: `4px solid ${STATUS_BORDER[task.status] ?? "#9e9e9e"}`,
      }}
    >
      <CardContent sx={{ flex: 1, py: 2, px: 2, "&:last-child": { pb: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap title={task.title}>
              {task.title}
            </Typography>
            {task.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
                {task.description}
              </Typography>
            )}
          </Box>
          <Chip
            label={task.status}
            size="small"
            color={STATUS_COLORS[task.status] ?? "default"}
            variant="filled"
            sx={{ flexShrink: 0, fontSize: "0.65rem", height: 20 }}
          />
        </Stack>

        {/* Prompt / script body */}
        {body && (
          <Box
            sx={{
              bgcolor: "action.hover",
              borderRadius: 1,
              px: 1.5,
              py: 1,
              mb: 1.5,
              borderLeft: "3px solid",
              borderLeftColor: "divider",
            }}
          >
            <MetaLabel>{prompt ? "Prompt" : "Script"}</MetaLabel>
            <Typography
              variant="body2"
              sx={{
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                fontFamily: "monospace",
                fontSize: "0.72rem",
                lineHeight: 1.6,
                color: "text.secondary",
                whiteSpace: "pre-wrap",
              }}
            >
              {body}
            </Typography>
          </Box>
        )}

        {/* Tags */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip
            icon={actionMeta.icon as React.ReactElement}
            label={actionMeta.label}
            size="small"
            color={actionMeta.color}
            variant="outlined"
            sx={{ fontSize: "0.65rem", height: 20 }}
          />
          {task.recurring && task.schedule && (
            <Tooltip title={task.schedule} placement="top">
              <Chip
                icon={<RepeatIcon sx={{ fontSize: 12 }} />}
                label={describeCron(task.schedule)}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 20 }}
              />
            </Tooltip>
          )}
          {!task.recurring && task.run_at && (
            <Chip
              icon={<EventIcon sx={{ fontSize: 12 }} />}
              label={relativeTime(task.run_at)}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 20 }}
            />
          )}
        </Stack>

        {/* Timing metadata */}
        {(task.next_run_at || task.last_run_at || task.inserted_at) && (
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: task.created_by ? 1 : 0 }}>
            {task.next_run_at && (
              <Tooltip title={new Date(task.next_run_at).toLocaleString()} placement="top">
                <Box sx={{ cursor: "default" }}>
                  <MetaLabel>Next run</MetaLabel>
                  <Typography variant="caption" fontWeight={600}>{relativeTime(task.next_run_at)}</Typography>
                </Box>
              </Tooltip>
            )}
            {task.last_run_at && (
              <Tooltip title={new Date(task.last_run_at).toLocaleString()} placement="top">
                <Box sx={{ cursor: "default" }}>
                  <MetaLabel>Last run</MetaLabel>
                  <Typography variant="caption" fontWeight={600}>{relativeTime(task.last_run_at)}</Typography>
                </Box>
              </Tooltip>
            )}
            {task.inserted_at && (
              <Tooltip title={new Date(task.inserted_at).toLocaleString()} placement="top">
                <Box sx={{ cursor: "default" }}>
                  <MetaLabel>Created</MetaLabel>
                  <Typography variant="caption" color="text.secondary">{relativeTime(task.inserted_at)}</Typography>
                </Box>
              </Tooltip>
            )}
          </Stack>
        )}

        {/* Origin metadata */}
        {task.created_by && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <PersonOutlineIcon sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography variant="caption" color="text.disabled" noWrap title={task.created_by}>
              {task.created_by}
            </Typography>
          </Stack>
        )}
      </CardContent>

      {/* Footer action bar */}
      <Box sx={{ px: 2, py: 0.75, borderTop: "1px solid", borderTopColor: "divider", bgcolor: "action.hover" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Switch checked={task.enabled} onChange={onToggle} size="small" disabled={busy} />
            <Typography variant="caption" color="text.secondary">
              {task.enabled ? "Enabled" : "Disabled"}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.25}>
            {originConvId && (
              <Tooltip title="Go to originating chat">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/ai?conv=${encodeURIComponent(originConvId)}`)}
                >
                  <ChatBubbleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Run now">
              <span>
                <IconButton size="small" onClick={onTrigger} disabled={busy}>
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit">
              <span>
                <IconButton size="small" onClick={onEdit} disabled={busy}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete">
              <span>
                <IconButton size="small" onClick={onDelete} color="error" disabled={busy}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, mt: 2.5 }}>
      {icon}
      <Typography variant="overline" sx={{ lineHeight: 1, letterSpacing: 1.2, fontSize: "0.7rem" }}>
        {label}
      </Typography>
      <Chip label={count} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
    </Stack>
  );
}

function TaskGrid({
  tasks,
  busyId,
  onToggle,
  onDelete,
  onTrigger,
  onEdit,
}: {
  tasks: ScheduledTask[];
  busyId: string | null;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTrigger: (id: string) => void;
  onEdit: (task: ScheduledTask) => void;
}) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          busy={busyId === task.id}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onTrigger={() => onTrigger(task.id)}
          onEdit={() => onEdit(task)}
        />
      ))}
    </Box>
  );
}

type ScheduleType = "one-shot" | "recurring";
type ActionType = "spawn" | "script";

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  initial?: ScheduledTask | null;
}

function TaskDialog({ open, onClose, onSave, initial }: TaskDialogProps) {
  const isEdit = initial != null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [actionType, setActionType] = useState<ActionType>(
    initial?.action_type === "script" ? "script" : "spawn"
  );
  const [prompt, setPrompt] = useState(
    typeof initial?.payload?.prompt === "string" ? initial.payload.prompt : ""
  );
  const [script, setScript] = useState(
    typeof initial?.payload?.script === "string" ? initial.payload.script : ""
  );
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initial?.recurring ? "recurring" : "one-shot"
  );
  const [runAt, setRunAt] = useState(
    initial?.run_at ? new Date(initial.run_at).toISOString().slice(0, 16) : ""
  );
  const [schedule, setSchedule] = useState(initial?.schedule ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setTitle(initial?.title ?? "");
    setActionType(initial?.action_type === "script" ? "script" : "spawn");
    setPrompt(typeof initial?.payload?.prompt === "string" ? initial.payload.prompt : "");
    setScript(typeof initial?.payload?.script === "string" ? initial.payload.script : "");
    setScheduleType(initial?.recurring ? "recurring" : "one-shot");
    setRunAt(initial?.run_at ? new Date(initial.run_at).toISOString().slice(0, 16) : "");
    setSchedule(initial?.schedule ?? "");
    onClose();
  }, [initial, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        const input: UpdateTaskInput = { title: title.trim() };
        if (actionType === "script") input.script = script.trim();
        else input.prompt = prompt.trim();
        if (scheduleType === "one-shot" && runAt) input.run_at = new Date(runAt).toISOString();
        if (scheduleType === "recurring" && schedule) input.schedule = schedule.trim();
        await onSave(input);
      } else {
        const input: CreateTaskInput = { title: title.trim(), action_type: actionType };
        if (actionType === "script") input.script = script.trim();
        else input.prompt = prompt.trim();
        if (scheduleType === "one-shot" && runAt) input.run_at = new Date(runAt).toISOString();
        if (scheduleType === "recurring" && schedule) input.schedule = schedule.trim();
        await onSave(input);
      }
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }, [title, actionType, prompt, script, scheduleType, runAt, schedule, isEdit, onSave, handleClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Task" : "New Scheduled Task"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <FormControl fullWidth>
            <InputLabel>Action</InputLabel>
            <Select
              value={actionType}
              label="Action"
              onChange={(e) => setActionType(e.target.value as ActionType)}
            >
              <MenuItem value="spawn">AI Prompt (spawn agent session)</MenuItem>
              <MenuItem value="script">Shell Script (run command)</MenuItem>
            </Select>
          </FormControl>

          {actionType === "spawn" && (
            <TextField
              label="Prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="What should the agent do when this task runs?"
              helperText="This prompt is sent to the AI at the scheduled time"
            />
          )}

          {actionType === "script" && (
            <TextField
              label="Shell Script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder={"#!/bin/bash\ncurl -s https://example.com/health"}
              helperText="Bash script to execute. Stdout/stderr shown as a toast (max 300 chars)."
              slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: "0.8rem" } } }}
            />
          )}

          <FormControl fullWidth>
            <InputLabel>Schedule</InputLabel>
            <Select
              value={scheduleType}
              label="Schedule"
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
            >
              <MenuItem value="one-shot">One-time</MenuItem>
              <MenuItem value="recurring">Recurring (cron)</MenuItem>
            </Select>
          </FormControl>

          {scheduleType === "one-shot" && (
            <TextField
              label="Run At"
              type="datetime-local"
              value={runAt}
              onChange={(e) => setRunAt(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}

          {scheduleType === "recurring" && (
            <>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {CRON_PRESETS.map((p) => (
                  <Chip
                    key={p.value}
                    label={p.label}
                    size="small"
                    variant={schedule === p.value ? "filled" : "outlined"}
                    color={schedule === p.value ? "primary" : "default"}
                    onClick={() => setSchedule(p.value)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
              <TextField
                label="Cron Expression"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                fullWidth
                placeholder="0 15 * * *"
                helperText={schedule ? describeCron(schedule) : "5-field cron: minute hour day month weekday"}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim() || submitting}>
          {submitting ? "Saving..." : isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ScheduledTasks() {
  const { tasks, loading, error, createTask, updateTask, deleteTask, toggleTask, triggerTask } =
    useScheduledTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<ScheduledTask | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (input: CreateTaskInput | UpdateTaskInput) => { await createTask(input as CreateTaskInput); },
    [createTask],
  );

  const handleUpdate = useCallback(
    async (input: CreateTaskInput | UpdateTaskInput) => {
      if (!editTask) return;
      await updateTask(editTask.id, input as UpdateTaskInput);
      setEditTask(null);
    },
    [editTask, updateTask],
  );

  const handleDelete = useCallback(
    async (id: string) => { await deleteTask(id); setDeleteConfirm(null); },
    [deleteTask],
  );

  const handleToggle = useCallback(
    async (id: string) => { setBusyId(id); try { await toggleTask(id); } finally { setBusyId(null); } },
    [toggleTask],
  );

  const handleTrigger = useCallback(
    async (id: string) => { setBusyId(id); try { await triggerTask(id); } finally { setBusyId(null); } },
    [triggerTask],
  );

  const recurring = tasks.filter((t) => t.recurring);
  const scheduled = tasks.filter((t) => !t.recurring && t.status !== "completed" && t.status !== "failed");
  const done = tasks.filter((t) => !t.recurring && (t.status === "completed" || t.status === "failed"));

  const gridProps = { busyId, onToggle: handleToggle, onDelete: setDeleteConfirm, onTrigger: handleTrigger, onEdit: setEditTask };

  if (loading) {
    return (
      <PageLayout>
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={200} />)}
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ScheduleIcon />
          <Typography variant="h6">Scheduled Tasks</Typography>
          <Chip label={tasks.length} size="small" />
        </Stack>
        <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setDialogOpen(true)}>
          New Task
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tasks.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <ScheduleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">No scheduled tasks yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a prompt that will be sent to the AI at a scheduled time
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Create Task
          </Button>
        </Box>
      ) : (
        <>
          {recurring.length > 0 && (
            <>
              <SectionHeader icon={<RepeatIcon sx={{ fontSize: 16, color: "text.secondary" }} />} label="Recurring" count={recurring.length} />
              <TaskGrid tasks={recurring} {...gridProps} />
            </>
          )}

          {scheduled.length > 0 && (
            <>
              <SectionHeader icon={<EventIcon sx={{ fontSize: 16, color: "text.secondary" }} />} label="Scheduled" count={scheduled.length} />
              <TaskGrid tasks={scheduled} {...gridProps} />
            </>
          )}

          {done.length > 0 && (
            <>
              <Divider sx={{ mt: 3, mb: 0.5 }} />
              <SectionHeader icon={<CheckCircleOutlineIcon sx={{ fontSize: 16, color: "text.disabled" }} />} label="Completed" count={done.length} />
              <TaskGrid tasks={done} {...gridProps} />
            </>
          )}
        </>
      )}

      <TaskDialog
        key="new-task"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreate}
      />

      <TaskDialog
        key={editTask?.id ?? "edit-task"}
        open={editTask !== null}
        onClose={() => setEditTask(null)}
        onSave={handleUpdate}
        initial={editTask}
      />

      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Task?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently remove the scheduled task.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
