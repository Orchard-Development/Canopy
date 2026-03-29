import {
  TextField,
  Stack,
  MenuItem,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Box,
} from "@mui/material";
import { TipTapEditor } from "./TipTapEditor";
import { TypeIcon } from "./TypeIcon";

// -- Types ------------------------------------------------------------------

export interface TicketFormValues {
  title: string;
  description: string;
  type: string;
  priority: string;
  labels: string[];
}

export const DEFAULT_FORM_VALUES: TicketFormValues = {
  title: "",
  description: "",
  type: "task",
  priority: "medium",
  labels: [],
};

interface TicketFormProps {
  values: TicketFormValues;
  onChange: (values: TicketFormValues) => void;
  errors?: Record<string, string>;
}

// -- Constants ---------------------------------------------------------------

const TYPES = ["bug", "feature", "improvement", "task"] as const;
const PRIORITIES = ["critical", "high", "medium", "low"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// -- Component ---------------------------------------------------------------

export function TicketForm({ values, onChange, errors }: TicketFormProps) {
  const update = <K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) => {
    onChange({ ...values, [key]: value });
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
          onChange={(e) => update("type", e.target.value)}
        >
          {TYPES.map((t) => (
            <MenuItem key={t} value={t} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TypeIcon type={t} fontSize="small" />
              {capitalize(t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Priority */}
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

      {/* Labels (freeSolo autocomplete) */}
      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[] as string[]}
        value={values.labels}
        onChange={(_event, newValue) => update("labels", newValue as string[])}
        renderTags={(tagValues, getTagProps) =>
          tagValues.map((label, index) => {
            const { key, ...rest } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={label}
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  "& .MuiChip-label": { px: 1, fontSize: "0.75rem" },
                }}
                {...rest}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField {...params} label="Labels" placeholder="Add labels..." fullWidth />
        )}
      />
    </Stack>
  );
}
