import { Box, type SxProps, type Theme } from "@mui/material";

interface Props { sx?: SxProps<Theme> }

export function ClawIcon({ sx }: Props) {
  return (
    <Box
      component="img"
      src="https://raw.githubusercontent.com/ultraworkers/claw-code/main/assets/clawd-hero.jpeg"
      alt="Claw Code"
      sx={{
        width: 22, height: 22, objectFit: "cover", borderRadius: 0.5,
        display: "inline-block", verticalAlign: "middle",
        ...((sx ?? {}) as Record<string, unknown>),
      }}
    />
  );
}
