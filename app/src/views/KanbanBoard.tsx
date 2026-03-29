import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Box, Typography, Skeleton, Button } from "@mui/material";
import Add from "@mui/icons-material/Add";
import { FilterBar, getDefaultFilters, type FilterState } from "../components/kanban/FilterBar";
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
import { TicketDialog } from "../components/kanban/TicketDialog";

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
  const { ticketsByColumn, connected, tickets, setTickets, projectId } = useKanban();
  const toast = useToast();

  // Filter state (Plan 04)
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute unique labels from all tickets
  const allLabels = useMemo(
    () => [...new Set(tickets.flatMap((t) => t.labels))].sort(),
    [tickets],
  );

  // Apply filters to ticketsByColumn (client-side, AND logic)
  const filteredTicketsByColumn = useMemo(() => {
    const result = {} as Record<ColumnId, Ticket[]>;
    for (const col of COLUMNS) {
      result[col] = ticketsByColumn[col].filter((ticket) => {
        if (filters.types.length > 0 && !filters.types.includes(ticket.type)) return false;
        if (filters.priorities.length > 0 && !filters.priorities.includes(ticket.priority)) return false;
        if (filters.labels.length > 0 && !filters.labels.some((l) => ticket.labels.includes(l))) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const inTitle = ticket.title.toLowerCase().includes(q);
          const inDesc = ticket.description?.toLowerCase().includes(q) ?? false;
          if (!inTitle && !inDesc) return false;
        }
        return true;
      });
    }
    return result;
  }, [ticketsByColumn, filters]);

  // Check if any filter is active
  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.search !== "";

  // Check if all filtered columns are empty
  const allColumnsEmpty = hasActiveFilters && COLUMNS.every((col) => filteredTicketsByColumn[col].length === 0);

  // Reset filters on project switch
  useEffect(() => {
    setFilters(getDefaultFilters());
  }, [projectId]);

  // Drag state
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);
  const snapshotRef = useRef<Ticket[]>([]);

  // Dialog state (Plan 03: ticket CRUD dialogs)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const lastDragEndRef = useRef(0);

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

  // -- Dialog handlers (Plan 03) -----------------------------------------------

  // Track drag end time to prevent accidental dialog open after drop
  const origHandleDragEnd = handleDragEnd;
  const handleDragEndWithTrack = useCallback(
    async (event: DragEndEvent) => {
      lastDragEndRef.current = Date.now();
      return origHandleDragEnd(event);
    },
    [origHandleDragEnd],
  );

  const openCreateDialog = useCallback(() => {
    setDialogMode("create");
    setSelectedTicket(null);
    setDialogOpen(true);
  }, []);

  const handleCardClick = useCallback((ticket: Ticket) => {
    // Guard against accidental click right after drag
    if (Date.now() - lastDragEndRef.current < 300) return;
    setDialogMode("edit");
    setSelectedTicket(ticket);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // Keyboard shortcuts: "N" opens create dialog, Cmd/Ctrl+F focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+F: focus search input (works even from inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.activeElement?.getAttribute("contenteditable") === "true") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openCreateDialog();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openCreateDialog]);

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
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={openCreateDialog}
        >
          Create Ticket
        </Button>
      }
    >
      {/* Filter bar (Plan 04) */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        allLabels={allLabels}
        searchInputRef={searchInputRef}
      />

      {/* Column container with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndWithTrack}
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
                  tickets={filteredTicketsByColumn[col]}
                  isOver={overColumnId === col}
                  onCardClick={handleCardClick}
                />
              ))}
        </Box>

        {/* No results state (Plan 04) */}
        {allColumnsEmpty && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              No tickets match your filters
            </Typography>
            <Button
              size="small"
              onClick={() => setFilters(getDefaultFilters())}
            >
              Clear filters
            </Button>
          </Box>
        )}

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

      {/* Ticket CRUD dialog (Plan 03) */}
      <TicketDialog
        open={dialogOpen}
        onClose={closeDialog}
        ticket={selectedTicket}
        projectId={project.id}
        mode={dialogMode}
      />
    </PageLayout>
  );
}
