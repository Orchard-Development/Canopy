import { Box, Stack, Typography } from "@mui/material";

interface ColorSwatchPickerProps {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorSwatchPicker({
  colors,
  value,
  onChange,
  label = "Color",
}: ColorSwatchPickerProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {colors.map((c) => (
          <Box
            key={c}
            onClick={() => onChange(c)}
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              bgcolor: c,
              cursor: "pointer",
              border: value === c ? "2px solid #fff" : "2px solid transparent",
              boxShadow: value === c ? `0 0 0 2px ${c}` : "none",
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
