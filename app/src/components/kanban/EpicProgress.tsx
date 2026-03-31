import { Box, Stack, Typography } from "@mui/material";
import type { Ticket } from "../../hooks/useKanban";

const STATUS_COLORS: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#f59e0b",
  review: "#8b5cf6",
  done: "#22c55e",
};

interface EpicProgressProps {
  tickets: Ticket[];
}

export function EpicProgress({ tickets }: EpicProgressProps) {
  if (tickets.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No tickets assigned
      </Typography>
    );
  }

  const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
  for (const t of tickets) {
    if (counts[t.status as keyof typeof counts] !== undefined) {
      counts[t.status as keyof typeof counts]++;
    }
  }

  const doneCount = counts.done;
  const total = tickets.length;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
        {doneCount}/{total} done
      </Typography>
      <Stack
        direction="row"
        sx={{ height: 6, borderRadius: 3, overflow: "hidden", gap: "1px" }}
      >
        {(["todo", "in_progress", "review", "done"] as const).map((col) =>
          counts[col] > 0 ? (
            <Box key={col} sx={{ flex: counts[col], bgcolor: STATUS_COLORS[col] }} />
          ) : null,
        )}
      </Stack>
    </Box>
  );
}
