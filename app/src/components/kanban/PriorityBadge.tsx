import { Chip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

interface PriorityBadgeProps {
  priority: string;
}

const PRIORITY_TOKEN_MAP: Record<string, { color: string; bgAlpha: number }> = {
  critical: { color: "error.main", bgAlpha: 0.12 },
  high: { color: "warning.main", bgAlpha: 0.12 },
  medium: { color: "primary.main", bgAlpha: 0.12 },
  low: { color: "text.secondary", bgAlpha: 0.08 },
};

function resolveToken(theme: Theme, tokenPath: string): string {
  const parts = tokenPath.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = (theme as any).palette;
  for (const part of parts) {
    value = value?.[part];
  }
  return typeof value === "string" ? value : (theme.palette as any).text.secondary;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const theme = useTheme();
  const config = PRIORITY_TOKEN_MAP[priority] ?? PRIORITY_TOKEN_MAP.low;
  const color = resolveToken(theme, `palette.${config.color}`);

  return (
    <Chip
      label={priority.charAt(0).toUpperCase() + priority.slice(1)}
      size="small"
      sx={{
        color,
        backgroundColor: alpha(color, config.bgAlpha),
        fontWeight: 500,
        height: 22,
        "& .MuiChip-label": {
          px: 1,
          fontSize: "0.75rem",
        },
      }}
    />
  );
}
