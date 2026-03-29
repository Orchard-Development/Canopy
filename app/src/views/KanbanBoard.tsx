import { useState, useCallback, useRef } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensors,
  useSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { PageLayout } from "../components/PageLayout";
import { useKanban, COLUMNS, COLUMN_LABELS, type Ticket, type ColumnId } from "../hooks/useKanban";
import { useActiveProject } from "../hooks/useActiveProject";
import { useToast } from "../hooks/useToast";
import { KanbanColumn } from "../components/kanban/KanbanColumn";
import { TicketCard } from "../components/kanban/TicketCard";

function SkeletonColumn() {
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
        <Skeleton
          key={i}
          variant="rounded"
          height={80}
          sx={{ mb: 1 }}
        />
      ))}
    </Box>
  );
}

// -- Helpers ------------------------------------------------------------------

/** Determine which column a droppable id belongs to. */
function resolveColumnId(droppableId: string): ColumnId | null {
  // Column droppable: "column-todo", "column-in_progress", etc.
  if (droppableId.startsWith("column-")) {
    const col = droppableId.slice(7) as ColumnId;
    return COLUMNS.includes(col) ? col : null;
  }
  return null;
}

/** Find the column that contains a ticket by its id. */
function findTicketColumn(tickets: Ticket[], ticketId: string): ColumnId | null {
  const ticket = tickets.find((t) => t.id === ticketId);
  return ticket ? (ticket.status as ColumnId) : null;
}

// -- Component ----------------------------------------------------------------

export default function KanbanBoard() {
  const { project } = useActiveProject();
  const { ticketsByColumn, connected, tickets, setTickets } = useKanban();
  const toast = useToast();

  // Drag state
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);
  const snapshotRef = useRef<Ticket[]>([]);

  // Sensors: pointer (5px activation distance) + touch (200ms delay)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // -- Drag handlers ----------------------------------------------------------

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const ticket = event.active.data.current?.ticket as Ticket | undefined;
      if (ticket) {
        setActiveTicket(ticket);
        // Snapshot for rollback
        snapshotRef.current = [...tickets];
      }
    },
    [tickets],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        setOverColumnId(null);
        return;
      }

      // Determine target column from over id
      let targetCol: ColumnId | null = null;

      // Check if over is a column droppable
      targetCol = resolveColumnId(String(over.id));

      // If over is a card, find its column via sortable container
      if (!targetCol) {
        const sortableData = over.data.current?.sortable;
        if (sortableData?.containerId) {
          targetCol = resolveColumnId(String(sortableData.containerId));
        }
      }

      // Fallback: find column by ticket id
      if (!targetCol) {
        targetCol = findTicketColumn(tickets, String(over.id));
      }

      setOverColumnId(targetCol);

      if (!targetCol) return;

      const activeId = String(active.id);
      const currentCol = findTicketColumn(tickets, activeId);

      // Cross-column move: optimistically update the ticket's status
      if (currentCol && targetCol !== currentCol) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: targetCol as string } : t,
          ),
        );
      }
    },
    [tickets, setTickets],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTicket(null);
      setOverColumnId(null);

      if (!over) return;

      const activeId = String(active.id);
      const ticket = tickets.find((t) => t.id === activeId);
      if (!ticket) return;

      const currentCol = ticket.status as ColumnId;

      // Determine target column
      let targetCol: ColumnId | null = resolveColumnId(String(over.id));
      if (!targetCol) {
        const sortableData = over.data.current?.sortable;
        if (sortableData?.containerId) {
          targetCol = resolveColumnId(String(sortableData.containerId));
        }
      }
      if (!targetCol) {
        targetCol = findTicketColumn(tickets, String(over.id));
      }
      if (!targetCol) return;

      const overId = String(over.id);

      // Same column reorder
      if (targetCol === currentCol && activeId !== overId && !overId.startsWith("column-")) {
        setTickets((prev) => {
          const colTickets = prev.filter((t) => t.status === currentCol);
          const otherTickets = prev.filter((t) => t.status !== currentCol);
          const oldIndex = colTickets.findIndex((t) => t.id === activeId);
          const newIndex = colTickets.findIndex((t) => t.id === overId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          const reordered = arrayMove(colTickets, oldIndex, newIndex);
          return [...otherTickets, ...reordered];
        });
        return; // Within-column reorder is local-only, no backend PATCH
      }

      // Cross-column move: status already updated optimistically in handleDragOver.
      // Now persist to backend.
      const originalStatus = snapshotRef.current.find((t) => t.id === activeId)?.status;
      if (originalStatus && originalStatus !== targetCol) {
        try {
          const res = await fetch(`/api/tickets/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetCol }),
          });
          if (!res.ok) {
            throw new Error(`PATCH failed: ${res.status}`);
          }
          // Success: channel will push authoritative update
        } catch {
          // Revert to snapshot on failure
          setTickets(snapshotRef.current);
          toast.error(
            "Move failed. The ticket has been returned to its previous position.",
          );
        }
      }
    },
    [tickets, setTickets, toast],
  );

  // No project selected
  if (!project) {
    return (
      <PageLayout title="Board" fill>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Select a project to view the board
          </Typography>
        </Box>
      </PageLayout>
    );
  }

  // Loading state: not connected yet and no tickets loaded
  const isLoading = !connected && tickets.length === 0;

  return (
    <PageLayout
      title="Board"
      fill
      actions={
        // Placeholder for "Create Ticket" button -- populated in Plan 03
        <Box />
      }
    >
      {/* Placeholder for filter bar -- populated in Plan 04 */}
      <Box sx={{ flexShrink: 0 }} />

      {/* Column container with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {isLoading
            ? COLUMNS.map((col) => <SkeletonColumn key={col} />)
            : COLUMNS.map((col) => (
                <KanbanColumn
                  key={col}
                  status={col}
                  label={COLUMN_LABELS[col]}
                  tickets={ticketsByColumn[col]}
                  isOver={overColumnId === col}
                />
              ))}
        </Box>

        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}
        >
          {activeTicket ? (
            <TicketCard ticket={activeTicket} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </PageLayout>
  );
}
