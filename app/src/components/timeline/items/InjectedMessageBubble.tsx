import { Paper, Typography, Stack, Chip } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import type { InjectedMessageData } from "../../../types/timeline";

interface Props {
  data: InjectedMessageData;
  timestamp: string;
}

export function InjectedMessageBubble({ data, timestamp }: Props) {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        borderLeft: 3,
        borderColor: "#00897b",
        bgcolor: "rgba(0, 137, 123, 0.04)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <PersonIcon sx={{ fontSize: 16, color: "#00897b" }} />
        <Typography variant="caption" fontWeight={600} color="#00897b">
          {data.sender.displayName}
        </Typography>
        {data.sender.machineId && (
          <Chip label={data.sender.machineId} size="small" sx={{ height: 18, fontSize: 10 }} />
        )}
        <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
          {time}
        </Typography>
      </Stack>
      <Typography variant="body2">{data.text}</Typography>
    </Paper>
  );
}
