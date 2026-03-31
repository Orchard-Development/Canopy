import { useTheme } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import BugReport from "@mui/icons-material/BugReport";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Task from "@mui/icons-material/Task";
import AccountTree from "@mui/icons-material/AccountTree";

interface TypeIconProps {
  type: string;
  fontSize?: "small" | "inherit";
}

const ICON_MAP: Record<
  string,
  { Icon: typeof BugReport; colorToken: string; label: string }
> = {
  bug: { Icon: BugReport, colorToken: "error.main", label: "Bug" },
  feature: { Icon: AutoAwesome, colorToken: "success.main", label: "Feature" },
  improvement: { Icon: TrendingUp, colorToken: "primary.main", label: "Improvement" },
  task: { Icon: Task, colorToken: "text.secondary", label: "Task" },
  epic: { Icon: AccountTree, colorToken: "secondary.main", label: "Epic" },
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

export function TypeIcon({ type, fontSize = "small" }: TypeIconProps) {
  const theme = useTheme();
  const config = ICON_MAP[type] ?? ICON_MAP.task;
  const color = resolveToken(theme, `palette.${config.colorToken}`);

  return (
    <config.Icon
      fontSize={fontSize}
      aria-label={config.label}
      sx={{ color }}
    />
  );
}
