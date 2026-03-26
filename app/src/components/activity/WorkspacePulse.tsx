import { Box, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import type { WorkspacePulse as PulseData } from "../../hooks/useActivityFeed";

interface Props {
  pulse: PulseData;
}

function formatRelative(iso: string): string {
  const delta = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  return `${Math.floor(delta / 3600)}h ago`;
}

export function WorkspacePulse({ pulse }: Props) {
  return (
    <Box
      sx={{
        mx: 1.5,
        mt: 1,
        mb: 0.5,
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: "action.selected",
        borderLeft: 3,
        borderColor: "primary.main",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        <AutoAwesomeIcon sx={{ fontSize: 14, color: "primary.main" }} />
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          Now
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled", ml: "auto" }}>
          {formatRelative(pulse.timestamp)}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.5 }}>
        {pulse.summary}
      </Typography>
    </Box>
  );
}
