import { Fab, Badge, keyframes } from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
`;

interface Props {
  count: number;
  hasMediaFab: boolean;
  hasProposalFab?: boolean;
  onClick: () => void;
}

export function TerminalActionFab({ count, hasMediaFab, hasProposalFab, onClick }: Props) {
  if (count === 0) return null;

  // Stack above other FABs: base 24, +64 per visible FAB below
  let bottom = 24;
  if (hasMediaFab) bottom += 64;
  if (hasProposalFab) bottom += 64;

  return (
    <Fab
      color="primary"
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom,
        right: 24,
        zIndex: 1200,
        animation: `${pulse} 2s ease-in-out infinite`,
      }}
    >
      <Badge
        badgeContent={count}
        color="error"
        max={9}
        sx={{ "& .MuiBadge-badge": { top: -4, right: -4 } }}
      >
        <TerminalIcon />
      </Badge>
    </Fab>
  );
}
