import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface Props {
  content: string;
  createdAt?: string;
}

export function ThinkingBubble({ content, createdAt }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);

  const codeBg = isDark
    ? alpha(theme.palette.common.white, 0.05)
    : alpha(theme.palette.common.black, 0.04);

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={() => setExpanded((prev) => !prev)}
      sx={{
        ml: 4,
        mb: 0.5,
        "&::before": { display: "none" },
        bgcolor: "transparent",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
        sx={{
          minHeight: 32,
          px: 1,
          py: 0,
          "& .MuiAccordionSummary-content": {
            display: "flex",
            alignItems: "center",
            gap: 1,
            my: 0.5,
          },
        }}
      >
        <PsychologyIcon sx={{ fontSize: 14, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Thinking
        </Typography>
        {createdAt && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
            {new Date(createdAt).toLocaleTimeString()}
          </Typography>
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1, pt: 0, pb: 1 }}>
        <Box
          sx={{
            fontFamily: "monospace",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            p: 1,
            borderRadius: 0.5,
            bgcolor: codeBg,
            overflow: "auto",
            maxHeight: 300,
            color: "text.secondary",
          }}
        >
          {content}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
