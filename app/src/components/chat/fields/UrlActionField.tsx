import { useState, useCallback, useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import type { FieldRendererProps } from "../../../types/forms";

/**
 * URL input field with an action button (e.g. "Quick start", "Generate from URL").
 * Auto-triggers the action when a URL is pre-filled (e.g. from AI prefill).
 * The action handler can return updates to batch-apply to other form fields.
 */
export function UrlActionField({
  field,
  value,
  onChange,
  allValues,
  onBatchChange,
  disabled,
}: FieldRendererProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoTriggered = useRef(false);
  const action = field.action;

  const runAction = useCallback(async () => {
    if (!action || !value.trim()) return;
    setLoading(true);
    setError("");
    try {
      const updates = await action.handler(value, allValues);
      if (updates) onBatchChange(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }, [action, value, allValues, onBatchChange]);

  // Auto-trigger the action when a URL is pre-filled (e.g. from AI prefill)
  useEffect(() => {
    if (!autoTriggered.current && value.trim() && action && !loading) {
      autoTriggered.current = true;
      runAction();
    }
  }, [value, action, loading, runAction]);

  return (
    <Box>
      {field.label && (
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {field.label}
        </Typography>
      )}
      {field.helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          {field.helperText}
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          value={value}
          onChange={(e) => { onChange(e.target.value); setError(""); }}
          placeholder={field.placeholder}
          fullWidth
          disabled={disabled || loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); runAction(); }
          }}
        />
        {action && (
          <Button
            variant="outlined"
            size="small"
            onClick={runAction}
            disabled={disabled || loading || !value.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            sx={{ textTransform: "none", whiteSpace: "nowrap", mt: "1px", minWidth: 130 }}
          >
            {loading ? (action.loadingLabel || "Loading...") : action.label}
          </Button>
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
