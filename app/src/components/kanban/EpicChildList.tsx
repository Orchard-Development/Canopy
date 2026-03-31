import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { Ticket } from "../../hooks/useKanban";
import { TypeIcon } from "./TypeIcon";

const STATUS_COLORS: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#f59e0b",
  review: "#8b5cf6",
  done: "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

interface EpicChildListProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

export function EpicChildList({ tickets, onTicketClick }: EpicChildListProps) {
  if (tickets.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
        No tickets assigned to this epic
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {tickets.map((ticket) => (
        <ListItemButton key={ticket.id} onClick={() => onTicketClick(ticket)} sx={{ borderRadius: 1, py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: STATUS_COLORS[ticket.status] || STATUS_COLORS.todo,
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary={ticket.title}
            primaryTypographyProps={{ variant: "body2", noWrap: true }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexShrink: 0 }}>
            {ticket.priority && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium,
                }}
              />
            )}
            <TypeIcon type={ticket.type} fontSize="small" />
          </Box>
        </ListItemButton>
      ))}
    </List>
  );
}
