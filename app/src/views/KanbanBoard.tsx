import { Box, Typography, Skeleton, Stack } from "@mui/material";
import { PageLayout } from "../components/PageLayout";
import { useKanban, COLUMNS, COLUMN_LABELS } from "../hooks/useKanban";
import { useActiveProject } from "../hooks/useActiveProject";
import { KanbanColumn } from "../components/kanban/KanbanColumn";

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

export default function KanbanBoard() {
  const { project } = useActiveProject();
  const { ticketsByColumn, connected, tickets } = useKanban();

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

      {/* Column container */}
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
              />
            ))}
      </Box>
    </PageLayout>
  );
}
