import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import BuildIcon from "@mui/icons-material/Build";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface Props {
  toolName: string;
  input?: string;
  result?: string;
  createdAt?: string;
}

function tryPrettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function previewResult(result?: string, max = 80): string {
  if (!result) return "no result";
  const oneLine = result.replace(/\n/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max) + "...";
}

export function HookToolCallBubble({ toolName, input, result, createdAt }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);

  const codeBg = isDark
    ? alpha(theme.palette.common.white, 0.05)
    : alpha(theme.palette.common.black, 0.04);

  const codeBoxSx = {
    fontFamily: "monospace",
    fontSize: 11,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    p: 1,
    borderRadius: 0.5,
    bgcolor: codeBg,
    overflow: "auto",
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={() => setExpanded((prev) => !prev)}
      sx={{
        ml: 4,
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
            overflow: "hidden",
          },
        }}
      >
        <BuildIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
        <Chip label={toolName} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
        <Typography
          variant="caption"
          color="text.disabled"
          noWrap
          sx={{ fontFamily: "monospace", fontSize: 11, flexShrink: 1, minWidth: 0 }}
        >
          {previewResult(result)}
        </Typography>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1, pt: 0, pb: 1 }}>
        {createdAt && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mb: 0.5, display: "block" }}>
            {new Date(createdAt).toLocaleTimeString()}
          </Typography>
        )}

        {input && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 11, mb: 0.25, display: "block" }}>
              Input
            </Typography>
            <Box sx={{ ...codeBoxSx, maxHeight: 200 }}>
              {tryPrettyJson(input)}
            </Box>
          </Box>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 11, mb: 0.25, display: "block" }}>
            Result
          </Typography>
          <Box sx={{ ...codeBoxSx, maxHeight: 300 }}>
            {result ?? "no result"}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
