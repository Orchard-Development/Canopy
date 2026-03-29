import { Card, CardActionArea, Stack, Typography, Box, Chip } from "@mui/material";
import type { Ticket } from "../../hooks/useKanban";
import { TypeIcon } from "./TypeIcon";
import { PriorityBadge } from "./PriorityBadge";
import { LabelChip } from "./LabelChip";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
}

const MAX_VISIBLE_LABELS = 3;

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const visibleLabels = ticket.labels.slice(0, MAX_VISIBLE_LABELS);
  const overflowCount = ticket.labels.length - MAX_VISIBLE_LABELS;

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        bgcolor: "background.paper",
        borderColor: "divider",
        cursor: "grab",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
        "&:hover": {
          boxShadow: theme.shadows[3],
          transform: "translateY(-1px)",
        },
      })}
    >
      <CardActionArea
        onClick={onClick ? () => onClick(ticket) : undefined}
        sx={{ p: 1.5 }}
        component="div"
      >
        <Stack spacing={1}>
          {/* Row 1: Type icon + title */}
          <Stack direction="row" spacing={0.75} alignItems="flex-start">
            <Box sx={{ pt: 0.25, flexShrink: 0 }}>
              <TypeIcon type={ticket.type} fontSize="small" />
            </Box>
            <Typography
              variant="body2"
              sx={{
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
              }}
            >
              {ticket.title}
            </Typography>
          </Stack>

          {/* Row 2: Priority badge + assignee */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            <PriorityBadge priority={ticket.priority} />
            {ticket.assignee && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {ticket.assignee}
              </Typography>
            )}
          </Stack>

          {/* Row 3: Label chips */}
          {ticket.labels.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {visibleLabels.map((label) => (
                <LabelChip key={label} label={label} />
              ))}
              {overflowCount > 0 && (
                <Chip
                  label={`+${overflowCount}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 22,
                    "& .MuiChip-label": { px: 0.75, fontSize: "0.75rem" },
                  }}
                />
              )}
            </Box>
          )}

          {/* Future: agent status indicator space */}
          <Box sx={{ minHeight: 0 }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
