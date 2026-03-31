import {
  TextField,
  Stack,
  MenuItem,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  Box,
} from "@mui/material";
import { TipTapEditor } from "./TipTapEditor";
import { TypeIcon } from "./TypeIcon";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { LabelAutocomplete } from "./LabelAutocomplete";
import type { Epic } from "../../hooks/useKanban";

// -- Types ------------------------------------------------------------------

export interface TicketFormValues {
  title: string;
  description: string;
  type: string;
  priority: string;
  labels: string[];
  epic_id: string | null;
  color: string;
}

export const DEFAULT_FORM_VALUES: TicketFormValues = {
  title: "",
  description: "",
  type: "task",
  priority: "medium",
  labels: [],
  epic_id: null,
  color: "#7c3aed",
};

interface TicketFormProps {
  values: TicketFormValues;
  onChange: (values: TicketFormValues) => void;
  errors?: Record<string, string>;
  epics?: Epic[];
}

// -- Constants ---------------------------------------------------------------

const TYPES = ["bug", "feature", "improvement", "task", "epic"] as const;
const PRIORITIES = ["critical", "high", "medium", "low"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

const EPIC_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#db2777", "#ea580c", "#65a30d", "#475569",
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// -- Component ---------------------------------------------------------------

export { EPIC_COLORS };

export function TicketForm({ values, onChange, errors, epics }: TicketFormProps) {
  const update = <K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const handleTypeChange = (newType: string) => {
    const updates: Partial<TicketFormValues> = { type: newType };
    if (newType === "epic") {
      updates.priority = "";
      updates.epic_id = null;
    } else if (values.type === "epic") {
      updates.priority = "medium";
      updates.color = "#7c3aed";
    }
    onChange({ ...values, ...updates });
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {/* Title */}
      <TextField
        label="Title"
        size="small"
        fullWidth
        required
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
        error={Boolean(errors?.title)}
        helperText={errors?.title}
        autoFocus
      />

      {/* Description (TipTap WYSIWYG) */}
      <TipTapEditor
        content={values.description}
        onChange={(html) => update("description", html)}
      />

      {/* Type */}
      <FormControl fullWidth size="small">
        <InputLabel id="ticket-type-label">Type</InputLabel>
        <Select
          labelId="ticket-type-label"
          label="Type"
          value={values.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {TYPES.map((t) => (
            <MenuItem key={t} value={t} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TypeIcon type={t} fontSize="small" />
              {capitalize(t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Priority or Epic color picker */}
      {values.type === "epic" ? (
        <ColorSwatchPicker
          colors={EPIC_COLORS}
          value={values.color}
          onChange={(c) => onChange({ ...values, color: c })}
          label="Epic color"
        />
      ) : (
        <FormControl fullWidth size="small">
          <InputLabel id="ticket-priority-label">Priority</InputLabel>
          <Select
            labelId="ticket-priority-label"
            label="Priority"
            value={values.priority}
            onChange={(e) => update("priority", e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: PRIORITY_COLORS[p],
                    flexShrink: 0,
                  }}
                />
                {capitalize(p)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Labels (freeSolo autocomplete) */}
      <LabelAutocomplete
        value={values.labels}
        onChange={(labels) => update("labels", labels)}
      />

      {/* Epic picker (shown only when epics exist and type is not epic) */}
      {values.type !== "epic" && epics && epics.length > 0 && (
        <Autocomplete
          size="small"
          options={epics}
          getOptionLabel={(e) => e.title}
          value={epics.find((e) => e.id === values.epic_id) ?? null}
          onChange={(_event, newValue) => update("epic_id", newValue?.id ?? null)}
          renderOption={(props, option) => (
            <li {...props}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: option.color,
                  mr: 1,
                  flexShrink: 0,
                }}
              />
              {option.title}
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Epic" placeholder="No epic" />
          )}
        />
      )}
    </Stack>
  );
}
