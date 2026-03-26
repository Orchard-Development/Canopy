import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PsychologyIcon from "@mui/icons-material/Psychology";
import type { MemoryContext } from "../../types/dispatch";

interface Props {
  memoryContext: MemoryContext | null;
}

export function MemoryPanel({ memoryContext }: Props) {
  if (!memoryContext || memoryContext.entries.length === 0) return null;

  return (
    <Accordion
      disableGutters
      sx={{
        width: "100%",
        bgcolor: "transparent",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PsychologyIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Memory context ({memoryContext.entries.length} entries)
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={0.5}>
          {memoryContext.entries.map((entry) => (
            <Stack
              key={entry.id}
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ py: 0.5 }}
            >
              <Chip
                label={entry.type}
                size="small"
                variant="outlined"
                sx={{ minWidth: 80, fontSize: 11 }}
              />
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {entry.title}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
