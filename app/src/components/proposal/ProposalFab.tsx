import { Fab, Badge, keyframes } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
`;

interface Props {
  count: number;
  unseenCount: number;
  bottomOffset: number;
  onClick: () => void;
}

export function ProposalFab({ count, unseenCount, bottomOffset, onClick }: Props) {
  if (unseenCount === 0) return null;

  return (
    <Fab
      color="secondary"
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom: bottomOffset,
        right: 24,
        zIndex: 1200,
        animation: unseenCount > 0 ? `${pulse} 2s ease-in-out infinite` : "none",
      }}
    >
      <Badge
        badgeContent={count}
        color="error"
        max={9}
        sx={{ "& .MuiBadge-badge": { top: -4, right: -4 } }}
      >
        <DescriptionIcon />
      </Badge>
    </Fab>
  );
}
