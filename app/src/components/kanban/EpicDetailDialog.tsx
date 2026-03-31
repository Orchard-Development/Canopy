import { useState, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Stack,
  Typography, Chip, Alert, CircularProgress,
} from "@mui/material";
import { Epic, Ticket } from "../../hooks/useKanban";
import { useToast } from "../../hooks/useToast";
import { EpicProgress } from "./EpicProgress";
import { EpicChildList } from "./EpicChildList";
import { TicketForm, TicketFormValues } from "./TicketForm";
import { TicketDialog } from "./TicketDialog";

interface EpicDetailDialogProps {
  open: boolean;
  onClose: () => void;
  epic: Epic | null;
  childTickets: Ticket[];
  projectId: string;
  epics: Epic[];
}

function epicToFormValues(epic: Epic): TicketFormValues {
  return {
    title: epic.title,
    description: epic.description || "",
    type: "epic",
    priority: "",
    labels: epic.labels || [],
    epic_id: null,
    color: epic.color,
  };
}

export function EpicDetailDialog({ open, onClose, epic, childTickets, projectId, epics }: EpicDetailDialogProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [values, setValues] = useState<TicketFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const toast = useToast();

  const handleEnter = useCallback(() => {
    setMode("view");
    setShowDeleteConfirm(false);
    if (epic) setValues(epicToFormValues(epic));
  }, [epic]);

  const handleEdit = () => {
    if (epic) setValues(epicToFormValues(epic));
    setMode("edit");
  };

  const handleCancelEdit = () => {
    setMode("view");
    setShowDeleteConfirm(false);
  };

  const handleSave = async () => {
    if (!epic || !values || !values.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/epics/${epic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description,
          color: values.color,
          labels: JSON.stringify(values.labels),
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Epic updated");
      setMode("view");
    } catch {
      toast.error("Failed to update epic");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!epic) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/epics/${epic.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Epic deleted");
      onClose();
    } catch {
      toast.error("Failed to delete epic");
    } finally {
      setSaving(false);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDialogOpen(true);
  };

  if (!epic) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth TransitionProps={{ onEnter: handleEnter }}>
        {mode === "view" ? (
          <>
            <Box sx={{ height: 4, bgcolor: epic.color }} />
            <DialogTitle>{epic.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                {epic.description && (
                  <Typography variant="body2" color="text.secondary">{epic.description}</Typography>
                )}
                <EpicProgress tickets={childTickets} />
                {epic.labels && epic.labels.length > 0 && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {epic.labels.map((label) => (
                      <Chip key={label} label={label} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Tickets ({childTickets.length})
                  </Typography>
                  <EpicChildList tickets={childTickets} onTicketClick={handleTicketClick} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEdit}>Edit</Button>
              <Button onClick={onClose}>Close</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>Edit Epic</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {values && <TicketForm values={values} onChange={setValues} />}
                {showDeleteConfirm && (
                  <Alert severity="warning" action={
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setShowDeleteConfirm(false)}>Keep Epic</Button>
                      <Button size="small" color="error" onClick={handleDelete}>Delete Epic</Button>
                    </Stack>
                  }>
                    This will remove the epic. Child tickets will not be deleted — they will become unassigned.
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              {!showDeleteConfirm && (
                <Button color="error" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button onClick={handleCancelEdit}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !values?.title.trim()}
              >
                {saving ? <CircularProgress size={20} /> : "Save"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      <TicketDialog
        open={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        ticket={selectedTicket}
        projectId={projectId}
        mode="edit"
        epics={epics}
      />
    </>
  );
}
