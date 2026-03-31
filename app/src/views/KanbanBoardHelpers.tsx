import { Box, Skeleton } from "@mui/material";
import { COLUMNS, type Ticket, type ColumnId } from "../hooks/useKanban";

// -- SkeletonColumn ----------------------------------------------------------

export function SkeletonColumn() {
  return (
    <Box
      sx={(theme) => ({
        flex: 1,
        minWidth: 260,
        borderRadius: `${theme.shape.borderRadius}px`,
        border: `1px solid ${theme.palette.divider}`,
        p: 2,
      })}
    >
      <Skeleton variant="text" width={100} height={28} sx={{ mb: 2 }} />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}

// -- Drag helpers ------------------------------------------------------------

/** Determine which column a droppable id belongs to. */
export function resolveColumnId(droppableId: string): ColumnId | null {
  if (droppableId.startsWith("column-")) {
    const col = droppableId.slice(7) as ColumnId;
    return COLUMNS.includes(col) ? col : null;
  }
  return null;
}

/** Find the column that contains a ticket by its id. */
export function findTicketColumn(tickets: Ticket[], ticketId: string): ColumnId | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  return ticket ? (ticket.status as ColumnId) : null;
}
