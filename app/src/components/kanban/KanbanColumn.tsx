import { Box, Typography, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import AddRounded from "@mui/icons-material/AddRounded";
import type { ColumnId, Epic, Ticket } from "../../hooks/useKanban";
import { TicketCard } from "./TicketCard";
import { EpicCard } from "./EpicCard";

// -- Column accent colors ----------------------------------------------------

const COLUMN_COLORS: Record<string, string> = {
  todo: "#6b7280",        // neutral gray
  in_progress: "#3b82f6", // blue
  review: "#f59e0b",      // amber
  done: "#22c55e",        // green
};

interface KanbanColumnProps {
  status: ColumnId;
  label: string;
  tickets: Ticket[];
  onCardClick?: (ticket: Ticket) => void;
  onCreate?: () => void;
  isOver?: boolean;
  epics?: Epic[];
  allTickets?: Ticket[];
  onEpicClick?: (epic: Epic) => void;
}

export function KanbanColumn({ status, label, tickets, onCardClick, onCreate, isOver, epics, allTickets, onEpicClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column-${status}` });
  const accentColor = COLUMN_COLORS[status] ?? "#6b7280";

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
      {/* Colored accent bar */}
      <Box sx={{ height: 3, bgcolor: accentColor, flexShrink: 0 }} />

      {/* Column header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.5, flexShrink: 0 }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: accentColor,
            flexShrink: 0,
          }}
        />
        <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ letterSpacing: 0.3 }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            bgcolor: "action.hover",
            px: 0.75,
            py: 0.1,
            borderRadius: 1,
            fontWeight: 600,
            fontSize: "0.7rem",
          }}
        >
          {tickets.length}
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
          {/* Epic cards rendered at the top of the todo column */}
          {status === "todo" && epics?.map((epic) => {
            const childTickets = allTickets?.filter((t) => t.epic_id === epic.id) ?? [];
            return (
              <EpicCard
                key={epic.id}
                epic={epic}
                childTickets={childTickets}
                onClick={onEpicClick}
              />
            );
          })}

          {tickets.length === 0 ? (
            <Box
              onClick={onCreate}
              sx={(theme) => ({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
                mx: 0.5,
                border: `1.5px dashed ${alpha(theme.palette.text.secondary, 0.2)}`,
                borderRadius: 1.5,
                cursor: onCreate ? "pointer" : "default",
                transition: "border-color 0.2s, background-color 0.2s",
                "&:hover": onCreate
                  ? {
                      borderColor: alpha(theme.palette.primary.main, 0.4),
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    }
                  : {},
              })}
            >
              <AddRounded
                sx={{ fontSize: 28, color: "text.disabled", mb: 0.5 }}
              />
              <Typography
                variant="body2"
                color="text.disabled"
                sx={{ userSelect: "none", fontSize: "0.8rem" }}
              >
                No tickets
              </Typography>
            </Box>
          ) : (
            tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onClick={onCardClick} epics={epics} />
            ))
          )}
        </Box>
      </SortableContext>
    </Box>
  );
}
