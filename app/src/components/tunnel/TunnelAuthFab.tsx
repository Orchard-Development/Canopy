import { Fab, Badge, keyframes } from "@mui/material";
import VpnKeyIcon from "@mui/icons-material/VpnKey";

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(244, 67, 54, 0); }
`;

interface Props {
  count: number;
  bottomOffset: number;
  onClick: () => void;
}

export function TunnelAuthFab({ count, bottomOffset, onClick }: Props) {
  if (count === 0) return null;

  return (
    <Fab
      color="error"
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom: bottomOffset,
        right: 24,
        zIndex: 1200,
        animation: `${pulse} 2s ease-in-out infinite`,
      }}
    >
      <Badge
        badgeContent={count}
        color="warning"
        max={9}
        sx={{ "& .MuiBadge-badge": { top: -4, right: -4 } }}
      >
        <VpnKeyIcon />
      </Badge>
    </Fab>
  );
}
