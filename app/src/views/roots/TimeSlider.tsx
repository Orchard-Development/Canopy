import { Box, Slider, Typography, alpha, useTheme } from "@mui/material";

interface TimeSliderProps {
  minTime: number;
  maxTime: number;
  value: number;
  onChange: (time: number) => void;
}

const STEP_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TimeSlider({
  minTime,
  maxTime,
  value,
  onChange,
}: TimeSliderProps) {
  const theme = useTheme();

  const handleSliderChange = (_: unknown, val: number | number[]) => {
    const next = typeof val === "number" ? val : val[0];
    onChange(next);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        height: 60,
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Slider
        min={minTime}
        max={maxTime}
        step={STEP_MS}
        value={value}
        onChange={handleSliderChange}
        sx={{
          flex: 1,
          color: "primary.main",
          "& .MuiSlider-thumb": { width: 14, height: 14 },
          "& .MuiSlider-track": { height: 3 },
          "& .MuiSlider-rail": {
            height: 3,
            bgcolor: alpha(theme.palette.text.primary, 0.12),
          },
        }}
      />

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 110, textAlign: "right", fontSize: 13 }}
      >
        {formatDate(value)}
      </Typography>
    </Box>
  );
}
