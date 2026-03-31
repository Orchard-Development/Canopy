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
import type { Ticket, Epic } from "../../hooks/useKanban";
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
  epics?: Epic[];
}

// -- Helpers ----------------------------------------------------------------

function ticketToFormValues(ticket: Ticket): TicketFormValues {
  return {
    title: ticket.title,
    description: ticket.description ?? "",
    type: ticket.type,
    priority: ticket.priority,
    labels: ticket.labels ?? [],
    epic_id: ticket.epic_id ?? null,
    color: "#7c3aed",
  };
}

// -- Component ---------------------------------------------------------------

export function TicketDialog({ open, onClose, ticket, projectId, mode, epics }: TicketDialogProps) {
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
      const isEpic = values.type === "epic";
      let res: Response;

      if (isEpic) {
        const payload = {
          title: values.title.trim(),
          description: values.description,
          color: values.color,
          labels: JSON.stringify(values.labels),
        };
        if (mode === "create") {
          res = await fetch(`/api/projects/${projectId}/epics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`/api/epics/${ticket!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } else {
        const payload = {
          title: values.title.trim(),
          description: values.description,
          type: values.type,
          priority: values.priority,
          labels: JSON.stringify(values.labels),
          epic_id: values.epic_id,
        };
        if (mode === "create") {
          res = await fetch(`/api/projects/${projectId}/tickets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`/api/tickets/${ticket!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }
      if (!res.ok) throw new Error("Request failed");
      const label = isEpic ? "Epic" : "Ticket";
      toast.success(mode === "create" ? `${label} created` : `${label} updated`);
      onClose();
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

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {mode === "create"
            ? values.type === "epic" ? "Create Epic" : "Create Ticket"
            : values.type === "epic" ? "Edit Epic" : "Edit Ticket"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TicketForm values={values} onChange={setValues} errors={errors} epics={epics} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {mode === "edit" && values.type !== "epic" && (
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
            {mode === "create"
              ? values.type === "epic" ? "Create Epic" : "Create Ticket"
              : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {mode === "edit" && ticket && (
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
