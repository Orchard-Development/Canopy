import { Box, Typography, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ColumnId, Ticket } from "../../hooks/useKanban";
import { TicketCard } from "./TicketCard";

interface KanbanColumnProps {
  status: ColumnId;
  label: string;
  tickets: Ticket[];
  onCardClick?: (ticket: Ticket) => void;
}

export function KanbanColumn({ status, label, tickets, onCardClick }: KanbanColumnProps) {
  return (
    <Box
      data-column={status}
      sx={(theme) => ({
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 260,
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: "hidden",
      })}
    >
      {/* Column header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.5, flexShrink: 0 }}
      >
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({tickets.length})
        </Typography>
      </Stack>

      {/* Card list */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1,
          pb: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {tickets.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: "center",
              py: 4,
              userSelect: "none",
            }}
          >
            No tickets
          </Typography>
        ) : (
          tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onClick={onCardClick} />
          ))
        )}
      </Box>
    </Box>
  );
}
