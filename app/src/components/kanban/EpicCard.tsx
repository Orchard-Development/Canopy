import { Card, CardActionArea, Stack, Typography } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import type { Epic, Ticket } from "../../hooks/useKanban";
import { EpicProgress } from "./EpicProgress";

interface EpicCardProps {
  epic: Epic;
  childTickets: Ticket[];
  onClick?: (epic: Epic) => void;
}

export function EpicCard({ epic, childTickets, onClick }: EpicCardProps) {
  // Register with sortable context but disable drag -- epic status is derived
  useSortable({ id: epic.id, disabled: true });

  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: "background.paper",
        borderColor: epic.color,
        borderWidth: 2,
        boxShadow: `0 0 0 1px ${epic.color}40`,
      }}
    >
      <CardActionArea
        onClick={onClick ? () => onClick(epic) : undefined}
        sx={{ p: 1.5 }}
        component="div"
      >
        <Stack spacing={0.75}>
          {/* Title row: bold per D-01 */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              wordBreak: "break-word",
            }}
          >
            {epic.title}
          </Typography>

          {/* Child count */}
          <Typography variant="caption" color="text.secondary">
            {childTickets.length} {childTickets.length === 1 ? "ticket" : "tickets"}
          </Typography>

          {/* Inline progress bar per D-04/D-05 */}
          <EpicProgress tickets={childTickets} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
