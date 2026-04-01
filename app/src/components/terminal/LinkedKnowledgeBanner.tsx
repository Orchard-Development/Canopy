import { useState } from "react";
import { Box, Chip, Collapse, Typography, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import type { RootsMatch } from "../../hooks/useLinkedKnowledge";

interface Props {
  matches: RootsMatch[];
  onNavigate?: (sessionId: string) => void;
}

export function LinkedKnowledgeBanner({ matches, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (matches.length === 0) return null;

  return (
    <Box sx={{ px: 1.5, py: 0.25 }}>
      <Chip
        icon={<LinkIcon sx={{ fontSize: 12 }} />}
        label={`${matches.length} related session${matches.length === 1 ? "" : "s"}`}
        size="small"
        onClick={() => setExpanded((v) => !v)}
        sx={{
          height: 18,
          fontSize: 10,
          fontWeight: 500,
          cursor: "pointer",
          "& .MuiChip-label": { px: 0.5 },
          "& .MuiChip-icon": { ml: 0.5 },
          bgcolor: "action.selected",
          "&:hover": { bgcolor: "action.hover" },
        }}
      />
      <Collapse in={expanded}>
        <Box sx={{ mt: 0.5, mb: 0.25, display: "flex", flexDirection: "column", gap: 0.25 }}>
          {matches.map((m) => (
            <Box
              key={m.source_path}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.(m.source_path);
              }}
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 0.75,
                cursor: onNavigate ? "pointer" : "default",
                borderRadius: 0.5,
                px: 0.5,
                py: 0.25,
                "&:hover": onNavigate ? { bgcolor: "action.hover" } : {},
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: 10, color: "text.disabled", flexShrink: 0, fontFamily: "monospace" }}
              >
                {Math.round(m.similarity * 100)}%
              </Typography>
              <Tooltip title={m.summary} enterDelay={400}>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ fontSize: 10, color: "text.secondary", minWidth: 0 }}
                >
                  {m.summary || m.source_path}
                </Typography>
              </Tooltip>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
