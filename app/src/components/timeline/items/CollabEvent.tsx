import { Typography, Stack } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import type { CollabEventData } from "../../../types/timeline";

const iconMap = {
  watch: VisibilityIcon,
  join: LoginIcon,
  leave: LogoutIcon,
  approve: CheckCircleIcon,
  reject: CancelIcon,
  trust_always: VerifiedUserIcon,
};

const labelMap: Record<string, string> = {
  watch: "started watching",
  join: "joined the session",
  leave: "left the session",
  approve: "approved the request",
  reject: "rejected the request",
  trust_always: "granted auto-trust",
};

interface Props {
  data: CollabEventData;
  timestamp: string;
}

export function CollabEvent({ data, timestamp }: Props) {
  const Icon = iconMap[data.action] || VisibilityIcon;
  const label = labelMap[data.action] || data.action;
  const time = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ py: 0.5 }}>
      <Icon sx={{ fontSize: 14, color: "text.disabled" }} />
      <Typography variant="caption" color="text.disabled">
        {data.actor} {label}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ opacity: 0.6 }}>
        {time}
      </Typography>
    </Stack>
  );
}
