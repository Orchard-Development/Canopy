import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";
import type { Ticket } from "../../hooks/useKanban";
import { useToast } from "../../hooks/useToast";
import { TicketForm, DEFAULT_FORM_VALUES } from "./TicketForm";
import type { TicketFormValues } from "./TicketForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

// -- Types ------------------------------------------------------------------

interface TicketDialogProps {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  projectId: string;
  mode: "create" | "edit";
}

// -- Helpers ----------------------------------------------------------------

function ticketToFormValues(ticket: Ticket): TicketFormValues {
  return {
    title: ticket.title,
    description: ticket.description ?? "",
    type: ticket.type,
    priority: ticket.priority,
    labels: ticket.labels ?? [],
  };
}

// -- Component ---------------------------------------------------------------

export function TicketDialog({ open, onClose, ticket, projectId, mode }: TicketDialogProps) {
  const toast = useToast();
  const [values, setValues] = useState<TicketFormValues>(DEFAULT_FORM_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form when dialog opens or ticket changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && ticket) {
        setValues(ticketToFormValues(ticket));
      } else {
        setValues(DEFAULT_FORM_VALUES);
      }
      setErrors({});
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(false);
    }
  }, [open, ticket, mode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!values.title.trim()) {
      newErrors.title = "Title is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch(`/api/projects/${projectId}/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title.trim(),
            description: values.description || null,
            type: values.type,
            priority: values.priority,
            labels: JSON.stringify(values.labels),
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }
        toast.success("Ticket created");
        onClose();
      } else if (mode === "edit" && ticket) {
        const res = await fetch(`/api/tickets/${ticket.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title.trim(),
            description: values.description || null,
            type: values.type,
            priority: values.priority,
            labels: JSON.stringify(values.labels),
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }
        toast.success("Ticket updated");
        onClose();
      }
    } catch {
      toast.error("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }
      toast.success("Ticket deleted");
      setDeleteOpen(false);
      onClose();
    } catch {
      toast.error("Could not delete ticket. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const isCreate = mode === "create";

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{isCreate ? "Create Ticket" : ticket?.title ?? "Edit Ticket"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TicketForm values={values} onChange={setValues} errors={errors} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!isCreate && (
            <Button
              color="error"
              onClick={() => setDeleteOpen(true)}
              sx={{ mr: "auto", textTransform: "none" }}
            >
              Delete Ticket
            </Button>
          )}
          <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none" }}
          >
            {isCreate ? "Create Ticket" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {!isCreate && ticket && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          ticketTitle={ticket.title}
          loading={deleting}
        />
      )}
    </>
  );
}
