import { Box, Chip, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useActivityFeed } from "../../hooks/useActivityFeed";
import type { Severity } from "../../hooks/useActivityFeed";

const severityIcon: Record<Severity, React.ReactElement> = {
  error: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 14 }} />,
  success: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
  info: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
};

const severityColor: Record<Severity, "error" | "warning" | "success" | "default"> = {
  error: "error",
  warning: "warning",
  success: "success",
  info: "default",
};

/**
 * Compact banner for the Chat header showing the most recent activity event.
 */
export function ChatTerminalBanner() {
  const { entries } = useActivityFeed();

  // Show the most recent non-info entry, or nothing
  const recent = [...entries].reverse().find((e) => e.severity !== "info");
  if (!recent) return null;

  const color = severityColor[recent.severity];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        bgcolor: "action.hover",
        borderRadius: 1,
        minHeight: 32,
        overflow: "hidden",
      }}
    >
      <Chip
        icon={severityIcon[recent.severity]}
        label={recent.severity}
        size="small"
        color={color}
        variant="outlined"
        sx={{ fontSize: 11, height: 22, flexShrink: 0 }}
      />
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {recent.summary}
      </Typography>
    </Box>
  );
}
