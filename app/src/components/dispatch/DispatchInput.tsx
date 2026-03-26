import { useState, useCallback, type KeyboardEvent } from "react";
import { Box, TextField, CircularProgress, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import IconButton from "@mui/material/IconButton";

interface Props {
  onSubmit: (input: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function DispatchInput({ onSubmit, loading, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || loading || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }, [value, loading, disabled, onSubmit]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        gap: 2,
        px: 2,
      }}
    >
      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
        What do you need?
      </Typography>
      <Box sx={{ width: "100%", maxWidth: 640, position: "relative" }}>
        <TextField
          multiline
          minRows={2}
          maxRows={8}
          fullWidth
          placeholder="Describe what you want to build..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading || disabled}
          autoFocus
          slotProps={{
            input: {
              sx: { pr: 6, fontFamily: "monospace", fontSize: 14 },
            },
          }}
        />
        <IconButton
          onClick={submit}
          disabled={!value.trim() || loading || disabled}
          sx={{ position: "absolute", right: 8, bottom: 8 }}
          size="small"
        >
          {loading ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
      <Typography variant="caption" color="text.disabled">
        Enter to plan. Shift+Enter for newline.
      </Typography>
    </Box>
  );
}
