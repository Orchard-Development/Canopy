import { Chip } from "@mui/material";

interface LabelChipProps {
  label: string;
  onDelete?: () => void;
}

export function LabelChip({ label, onDelete }: LabelChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      onDelete={onDelete}
      sx={{
        height: 22,
        "& .MuiChip-label": {
          px: 1,
          fontSize: "0.75rem",
        },
      }}
    />
  );
}
