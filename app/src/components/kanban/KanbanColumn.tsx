import { Box, Typography, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ColumnId, Ticket } from "../../hooks/useKanban";
import { TicketCard } from "./TicketCard";

interface KanbanColumnProps {
  status: ColumnId;
  label: string;
  tickets: Ticket[];
  onCardClick?: (ticket: Ticket) => void;
  isOver?: boolean;
}

export function KanbanColumn({ status, label, tickets, onCardClick, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column-${status}` });

  return (
    <Box
      ref={setNodeRef}
      data-column={status}
      sx={(theme) => ({
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 260,
        backgroundColor: isOver
          ? alpha(theme.palette.primary.main, 0.08)
          : alpha(theme.palette.background.paper, 0.5),
        border: `1px solid ${
          isOver
            ? alpha(theme.palette.primary.main, 0.3)
            : theme.palette.divider
        }`,
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: "hidden",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
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
      <SortableContext
        items={tickets.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
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
      </SortableContext>
    </Box>
  );
}
