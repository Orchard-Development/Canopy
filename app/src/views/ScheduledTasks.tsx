import { useState, useCallback } from "react";
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ScheduleIcon from "@mui/icons-material/Schedule";
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

function TaskCard({
  task,
  onToggle,
  onDelete,
  onTrigger,
  onEdit,
}: {
  task: ScheduledTask;
  onToggle: () => void;
  onDelete: () => void;
  onTrigger: () => void;
  onEdit: () => void;
}) {
  const prompt =
    typeof task.payload?.prompt === "string" ? task.payload.prompt : null;

  return (
    <Card variant="outlined" sx={{ mb: 1.5, opacity: task.enabled ? 1 : 0.6 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {task.title}
            </Typography>
            {prompt && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.25,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                }}
              >
                {prompt}
              </Typography>
            )}
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              <Chip
                label={task.status}
                size="small"
                color={STATUS_COLORS[task.status] || "default"}
                variant="outlined"
              />
              {task.recurring && task.schedule && (
                <Chip label={`cron: ${task.schedule}`} size="small" variant="outlined" />
              )}
              {task.next_run_at && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                  Next: {new Date(task.next_run_at).toLocaleString()}
                </Typography>
              )}
              {task.last_run_at && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                  Last: {new Date(task.last_run_at).toLocaleString()}
                </Typography>
              )}
            </Stack>
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Switch checked={task.enabled} onChange={onToggle} size="small" />
            <IconButton size="small" onClick={onTrigger} title="Run now">
              <PlayArrowIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onEdit} title="Edit">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onDelete} color="error" title="Delete">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

type ScheduleType = "one-shot" | "recurring";

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  initial?: ScheduledTask | null;
}

function TaskDialog({ open, onClose, onSave, initial }: TaskDialogProps) {
  const isEdit = initial != null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [prompt, setPrompt] = useState(
    typeof initial?.payload?.prompt === "string" ? initial.payload.prompt : ""
  );
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initial?.recurring ? "recurring" : "one-shot"
  );
  const [runAt, setRunAt] = useState(
    initial?.run_at
      ? new Date(initial.run_at).toISOString().slice(0, 16)
      : ""
  );
  const [schedule, setSchedule] = useState(initial?.schedule ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens with new initial value
  const handleClose = useCallback(() => {
    setTitle(initial?.title ?? "");
    setPrompt(typeof initial?.payload?.prompt === "string" ? initial.payload.prompt : "");
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
        const input: UpdateTaskInput = { title: title.trim(), prompt: prompt.trim() };
        if (scheduleType === "one-shot" && runAt) input.run_at = new Date(runAt).toISOString();
        if (scheduleType === "recurring" && schedule) input.schedule = schedule.trim();
        await onSave(input);
      } else {
        const input: CreateTaskInput = {
          title: title.trim(),
          action_type: "spawn",
          prompt: prompt.trim(),
        };
        if (scheduleType === "one-shot" && runAt) input.run_at = new Date(runAt).toISOString();
        if (scheduleType === "recurring" && schedule) input.schedule = schedule.trim();
        await onSave(input);
      }
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }, [title, prompt, scheduleType, runAt, schedule, isEdit, onSave, handleClose]);

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
            <TextField
              label="Cron Expression"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              fullWidth
              placeholder="0 15 * * *"
              helperText="5-field cron: minute hour day month weekday"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!title.trim() || submitting}
        >
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

  const handleCreate = useCallback(
    async (input: CreateTaskInput | UpdateTaskInput) => {
      await createTask(input as CreateTaskInput);
    },
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
    async (id: string) => {
      await deleteTask(id);
      setDeleteConfirm(null);
    },
    [deleteTask],
  );

  if (loading) {
    return (
      <PageLayout>
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ScheduleIcon />
          <Typography variant="h6">Scheduled Tasks</Typography>
          <Chip label={tasks.length} size="small" />
        </Stack>
        <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setDialogOpen(true)}>
          New Task
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => setDeleteConfirm(task.id)}
            onTrigger={() => triggerTask(task.id)}
            onEdit={() => setEditTask(task)}
          />
        ))
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreate}
      />

      <TaskDialog
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
          <Button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
