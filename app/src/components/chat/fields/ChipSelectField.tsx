import { Box, Chip, Stack, Typography } from "@mui/material";
import type { FieldRendererProps } from "../../../types/forms";

/** Single-select chip group. Value is the selected option's value string. */
export function ChipSelectField({
  field,
  value,
  onChange,
  disabled,
}: FieldRendererProps) {
  const options = field.options ?? [];

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {field.label}
      </Typography>
      {field.helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          {field.helperText}
        </Typography>
      )}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {options.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            onClick={() => !disabled && onChange(opt.value)}
            color={value === opt.value ? "primary" : "default"}
            variant={value === opt.value ? "filled" : "outlined"}
            disabled={disabled}
          />
        ))}
      </Stack>
    </Box>
  );
}
