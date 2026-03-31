import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Alert,
  Stack,
} from "@mui/material";
import { EpicForm } from "./EpicForm";
import type { EpicFormValues } from "./EpicForm";
import type { Epic } from "../../hooks/useKanban";
import { useToast } from "../../hooks/useToast";

// -- Types -------------------------------------------------------------------

interface EpicDialogProps {
  open: boolean;
  onClose: () => void;
  epic: Epic | null;
  projectId: string;
  mode: "create" | "edit";
}

// -- Component ---------------------------------------------------------------

export function EpicDialog({ open, onClose, epic, projectId, mode }: EpicDialogProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset delete confirmation state when dialog opens
  useEffect(() => {
    if (open) {
      setShowDeleteConfirm(false);
      setSaving(false);
    }
  }, [open]);

  const handleSave = useCallback(
    async (values: EpicFormValues) => {
      setSaving(true);
      try {
        const url =
          mode === "create"
            ? `/api/projects/${projectId}/epics`
            : `/api/epics/${epic!.id}`;
        const method = mode === "create" ? "POST" : "PATCH";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error();
        toast.success(mode === "create" ? "Epic created" : "Epic updated");
        onClose();
      } catch {
        toast.error("Could not save epic. Check your connection and try again.");
      } finally {
        setSaving(false);
      }
    },
    [mode, projectId, epic, onClose, toast],
  );

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/epics/${epic!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Epic deleted");
      onClose();
    } catch {
      toast.error("Could not delete epic. Try again.");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  }, [epic, onClose, toast]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "Create Epic" : "Edit Epic"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <EpicForm epic={epic} onSave={handleSave} saving={saving} />

          {mode === "edit" && !showDeleteConfirm && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setShowDeleteConfirm(true)}
              sx={{ alignSelf: "flex-start" }}
            >
              Delete
            </Button>
          )}

          {showDeleteConfirm && (
            <Alert
              severity="warning"
              sx={{ "& .MuiAlert-message": { width: "100%" } }}
            >
              This will remove the epic. Child tickets will not be deleted — they
              will become unassigned.
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" onClick={() => setShowDeleteConfirm(false)}>
                  Keep Epic
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete Epic
                </Button>
              </Stack>
            </Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
