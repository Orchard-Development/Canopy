import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Collapse, Typography, Tooltip, IconButton } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import GroupIcon from "@mui/icons-material/Group";
import type { RootsMatch } from "../../hooks/useLinkedKnowledge";
import { requestTerminalOpen } from "../../hooks/useDispatch";
import { api } from "../../lib/api";

interface Props {
  matches: RootsMatch[];
}

export function LinkedKnowledgeBanner({ matches }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleViewTranscript = useCallback((sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  }, [navigate]);

  const handleResume = useCallback(async (sessionId: string, summary?: string) => {
    if (resumingId) return;
    setResumingId(sessionId);
    try {
      const result = await api.resumeSession(sessionId);
      requestTerminalOpen(result.id, `Resume: ${summary || sessionId.slice(0, 8)}`);
    } catch { /* resume failed */ }
    setResumingId(null);
  }, [resumingId]);

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
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                borderRadius: 0.5,
                px: 0.5,
                py: 0.25,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: 10, color: "text.disabled", flexShrink: 0, fontFamily: "monospace" }}
              >
                {Math.round(m.similarity * 100)}%
              </Typography>
              {!m.is_local && (
                <Tooltip title="Team member's session">
                  <GroupIcon sx={{ fontSize: 12, color: "info.main", flexShrink: 0 }} />
                </Tooltip>
              )}
              <Tooltip title={m.summary} enterDelay={400}>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ fontSize: 10, color: "text.secondary", minWidth: 0, flex: 1 }}
                >
                  {m.summary || m.source_path}
                </Typography>
              </Tooltip>
              <Tooltip title="View transcript">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleViewTranscript(m.source_path); }}
                  sx={{ p: 0.25 }}
                >
                  <ArticleOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              {m.is_local && (
                <Tooltip title="Resume session">
                  <IconButton
                    size="small"
                    disabled={resumingId === m.source_path}
                    onClick={(e) => { e.stopPropagation(); handleResume(m.source_path, m.summary); }}
                    sx={{ p: 0.25 }}
                  >
                    <PlayArrowIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
