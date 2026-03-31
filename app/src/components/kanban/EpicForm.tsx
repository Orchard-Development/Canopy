import { useState, useEffect } from "react";
import { Box, Stack, TextField, Typography, Button } from "@mui/material";
import type { Epic } from "../../hooks/useKanban";

// -- Constants ---------------------------------------------------------------

export const EPIC_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#db2777", "#ea580c", "#65a30d", "#475569",
];

// -- Types -------------------------------------------------------------------

export interface EpicFormValues {
  title: string;
  description: string;
  color: string;
}

interface EpicFormProps {
  epic?: Epic | null;
  onSave: (values: EpicFormValues) => void;
  saving?: boolean;
}

// -- Component ---------------------------------------------------------------

export function EpicForm({ epic, onSave, saving }: EpicFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(EPIC_COLORS[0]);

  useEffect(() => {
    if (epic) {
      setTitle(epic.title);
      setDescription(epic.description || "");
      setColor(epic.color);
    } else {
      setTitle("");
      setDescription("");
      setColor(EPIC_COLORS[0]);
    }
  }, [epic]);

  return (
    <Stack spacing={2}>
      <TextField
        label="Title"
        size="small"
        fullWidth
        required
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <TextField
        label="Description"
        size="small"
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Box>
        <Typography variant="caption" color="text.secondary">
          Epic color
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
          {EPIC_COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                bgcolor: c,
                cursor: "pointer",
                border: color === c ? "2px solid white" : "2px solid transparent",
                boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
              }}
            />
          ))}
        </Box>
      </Box>

      <Button
        variant="contained"
        size="small"
        onClick={() => onSave({ title, description, color })}
        disabled={!title.trim() || saving}
        sx={{ alignSelf: "flex-start" }}
      >
        {epic ? "Save" : "Create Epic"}
      </Button>
    </Stack>
  );
}
