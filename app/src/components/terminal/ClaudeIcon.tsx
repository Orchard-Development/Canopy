import { Box, type SxProps, type Theme } from "@mui/material";

interface Props { sx?: SxProps<Theme> }

export function ClaudeIcon({ sx }: Props) {
  return (
    <Box
      component="img"
      src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/claude-color.png"
      alt="Claude"
      sx={{
        width: 22, height: 22, objectFit: "contain", borderRadius: 0.5,
        display: "inline-block", verticalAlign: "middle",
        ...((sx ?? {}) as Record<string, unknown>),
      }}
    />
  );
}
