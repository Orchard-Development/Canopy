import { Box, type SxProps, type Theme, useTheme } from "@mui/material";

interface Props { sx?: SxProps<Theme> }

export function OrchardIcon({ sx }: Props) {
  const mode = useTheme().palette.mode;
  return (
    <Box
      component="img"
      src={mode === "dark" ? "/logo-light.png" : "/logo-dark.png"}
      alt="Orchard"
      sx={{
        width: 22, height: 22, objectFit: "contain", borderRadius: 0.5,
        display: "inline-block", verticalAlign: "middle",
        ...((sx ?? {}) as Record<string, unknown>),
      }}
    />
  );
}
