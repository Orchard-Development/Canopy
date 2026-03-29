import { useState, useEffect, useMemo } from "react";
import { useActiveProject } from "./useActiveProject";
import { useChannel } from "./useChannel";
import { useChannelEvent } from "./useChannelEvent";

// -- Types ------------------------------------------------------------------

export interface Ticket {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string | null;
  type: string; // "bug" | "feature" | "improvement" | "task"
  priority: string; // "critical" | "high" | "medium" | "low"
  status: string; // "todo" | "in_progress" | "review" | "done"
  labels: string[];
  assignee: string | null;
  agent_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export const COLUMNS = ["todo", "in_progress", "review", "done"] as const;
export type ColumnId = (typeof COLUMNS)[number];

export const COLUMN_LABELS: Record<ColumnId, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

// -- Channel event payloads -------------------------------------------------

interface JoinPayload {
  tickets: Ticket[];
}

interface TicketEvent {
  ticket: Ticket;
}

interface TicketDeletedEvent {
  id: string;
}

// -- Hook -------------------------------------------------------------------

export function useKanban() {
  const { project } = useActiveProject();
  const topic = project ? `kanban:${project.id}` : null;

  const { data, channel, connected } = useChannel<JoinPayload>(topic);

  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Initialize from join payload
  useEffect(() => {
    if (data?.tickets) {
      setTickets(data.tickets);
    }
  }, [data]);

  // Reset tickets when topic changes (project switch)
  useEffect(() => {
    if (!topic) {
      setTickets([]);
    }
  }, [topic]);

  // Real-time event handlers
  const created = useChannelEvent<TicketEvent>(channel, "ticket:created");
  const updated = useChannelEvent<TicketEvent>(channel, "ticket:updated");
  const deleted = useChannelEvent<TicketDeletedEvent>(channel, "ticket:deleted");

  useEffect(() => {
    if (created?.ticket) {
      setTickets((prev) => {
        // Avoid duplicates (in case of reconnect race)
        if (prev.some((t) => t.id === created.ticket.id)) return prev;
        return [...prev, created.ticket];
      });
    }
  }, [created]);

  useEffect(() => {
    if (updated?.ticket) {
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.ticket.id ? updated.ticket : t)),
      );
    }
  }, [updated]);

  useEffect(() => {
    if (deleted?.id) {
      setTickets((prev) => prev.filter((t) => t.id !== deleted.id));
    }
  }, [deleted]);

  // Group tickets by column, sorted by created_at ascending
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Ticket[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const ticket of tickets) {
      const col = ticket.status as ColumnId;
      if (grouped[col]) {
        grouped[col].push(ticket);
      }
    }

    // Sort each column by created_at ascending (oldest first)
    for (const col of COLUMNS) {
      grouped[col].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    return grouped;
  }, [tickets]);

  return {
    tickets,
    ticketsByColumn,
    setTickets,
    connected,
    projectId: project?.id ?? null,
  };
}
