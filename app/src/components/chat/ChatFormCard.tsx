import { useState, useCallback, useEffect, useRef } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getFieldRenderer } from "../../lib/forms/fieldRegistry";
import type { FormDef, FormFieldDef, FormStatus } from "../../types/forms";

// Side-effect: register all custom field renderers
import "./fields";

interface Props {
  form: FormDef;
  prefill?: Record<string, string>;
  onSubmitted?: (result: {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  }) => void;
}

function isFieldVisible(field: FormFieldDef, values: Record<string, string>): boolean {
  if (!field.showWhen) return true;
  const current = values[field.showWhen.field] || "";
  const allowed = field.showWhen.value;
  return Array.isArray(allowed) ? allowed.includes(current) : current === allowed;
}

function initValues(
  fields: FormFieldDef[],
  prefill?: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const f of fields) {
    result[f.name] = prefill?.[f.name] ?? f.defaultValue ?? "";
  }
  return result;
}

export function ChatFormCard({ form, prefill, onSubmitted }: Props) {
  // If the form has a custom component, wrap it in a card and delegate.
  if (form.component) {
    const Custom = form.component;
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1.5 }}>
        <Custom prefill={prefill} onSubmitted={onSubmitted} embedded />
      </Paper>
    );
  }

  const [values, setValues] = useState(() => initValues(form.fields, prefill));
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<FormStatus>("idle");
  const [resultMsg, setResultMsg] = useState("");
  const prevSourceRef = useRef<Record<string, string>>({});

  // Auto-compute derived fields when their source field changes
  useEffect(() => {
    if (status !== "idle") return;
    const updates: Record<string, string> = {};
    for (const field of form.fields) {
      if (!field.computeFrom || touched.has(field.name)) continue;
      const sourceVal = values[field.computeFrom.field] || "";
      if (sourceVal !== prevSourceRef.current[field.name]) {
        updates[field.name] = field.computeFrom.transform(sourceVal);
        prevSourceRef.current[field.name] = sourceVal;
      }
    }
    if (Object.keys(updates).length > 0) {
      setValues((v) => ({ ...v, ...updates }));
    }
  }, [values, form.fields, touched, status]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setTouched((t) => new Set(t).add(name));
  }, []);

  const handleBatchChange = useCallback((updates: Record<string, string>) => {
    setValues((v) => ({ ...v, ...updates }));
    setTouched((t) => {
      const next = new Set(t);
      for (const k of Object.keys(updates)) next.add(k);
      return next;
    });
  }, []);

  const canSubmit = form.fields
    .filter((f) => f.required && isFieldVisible(f, values))
    .every((f) => values[f.name]?.trim());

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || status !== "idle") return;
    setStatus("submitting");
    try {
      const result = await form.onSubmit(values);
      setStatus(result.success ? "success" : "error");
      setResultMsg(result.message);
      if (result.success) onSubmitted?.(result);
    } catch (err) {
      setStatus("error");
      setResultMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }, [canSubmit, status, form, values, onSubmitted]);

  if (status === "success") {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1.5, borderColor: "success.main" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckCircleIcon color="success" />
          <Typography variant="body2" color="success.main">{resultMsg}</Typography>
        </Stack>
      </Paper>
    );
  }

  const isDisabled = status === "submitting";

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{form.title}</Typography>
      {form.description && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
          {form.description}
        </Typography>
      )}
      <Stack spacing={1.5}>
        {form.fields.filter((f) => !f.hidden && isFieldVisible(f, values)).map((field) => {
          const CustomRenderer = getFieldRenderer(field.type);
          if (CustomRenderer) {
            return (
              <CustomRenderer
                key={field.name}
                field={field}
                value={values[field.name] || ""}
                onChange={(v) => handleChange(field.name, v)}
                allValues={values}
                onBatchChange={handleBatchChange}
                disabled={isDisabled}
              />
            );
          }
          return (
            <BuiltinField
              key={field.name}
              field={field}
              value={values[field.name] || ""}
              onChange={(v) => handleChange(field.name, v)}
              disabled={isDisabled}
            />
          );
        })}
      </Stack>
      {status === "error" && <Alert severity="error" sx={{ mt: 1.5 }}>{resultMsg}</Alert>}
      <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
        <Button
          variant="contained"
          size="small"
          color={form.danger ? "error" : "primary"}
          onClick={handleSubmit}
          disabled={!canSubmit || isDisabled}
          startIcon={isDisabled ? <CircularProgress size={16} /> : undefined}
        >
          {isDisabled ? "Submitting..." : form.submitLabel || "Submit"}
        </Button>
      </Stack>
    </Paper>
  );
}

function BuiltinField({
  field, value, onChange, disabled,
}: {
  field: FormFieldDef; value: string;
  onChange: (value: string) => void; disabled?: boolean;
}) {
  if (field.type === "select") {
    return (
      <TextField
        select size="small" label={field.label}
        value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled} fullWidth helperText={field.helperText}
      >
        {field.options?.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </TextField>
    );
  }
  return (
    <TextField
      size="small" label={field.label} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder} helperText={field.helperText}
      required={field.required}
      multiline={field.type === "textarea"}
      minRows={field.type === "textarea" ? 2 : undefined}
      maxRows={field.type === "textarea" ? 4 : undefined}
      disabled={disabled} fullWidth
    />
  );
}
