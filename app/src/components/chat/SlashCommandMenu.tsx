import { useEffect, useRef } from "react";
import { Box, Typography, Paper } from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RuleIcon from "@mui/icons-material/Gavel";
import BuildIcon from "@mui/icons-material/Build";

export interface SlashItem {
  name: string;
  description: string;
  type: "skill" | "rule" | "tool";
  category?: string;
}

interface Props {
  items: SlashItem[];
  filter: string;
  onSelect: (item: SlashItem) => void;
  onClose: () => void;
  visible: boolean;
  selectedIndex: number;
  onHover: (index: number) => void;
}

const TYPE_ICONS = {
  skill: <AutoFixHighIcon sx={{ fontSize: 16 }} />,
  rule: <RuleIcon sx={{ fontSize: 16 }} />,
  tool: <BuildIcon sx={{ fontSize: 16 }} />,
};

const TYPE_COLORS = {
  skill: "primary.main",
  rule: "warning.main",
  tool: "info.main",
};

export function SlashCommandMenu({
  items, filter, onSelect, onClose, visible, selectedIndex, onHover,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const children = listRef.current.querySelectorAll("[data-slash-item]");
    const el = children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!visible || items.length === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        mb: 0.5,
        maxHeight: 400,
        overflow: "auto",
        zIndex: 1300,
        border: 1,
        borderColor: "divider",
      }}
      ref={listRef}
    >
      <Box sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          {items.length} command{items.length !== 1 ? "s" : ""}
          {" "}&middot; arrows to navigate, enter to select, esc to close
        </Typography>
      </Box>
      {items.slice(0, 50).map((item, idx) => (
        <Box
          key={`${item.type}-${item.name}`}
          data-slash-item
          onClick={() => onSelect(item)}
          onMouseEnter={() => onHover(idx)}
          sx={{
            px: 1.5,
            py: 0.75,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: idx === selectedIndex ? "action.selected" : "transparent",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box sx={{ color: TYPE_COLORS[item.type], display: "flex", flexShrink: 0 }}>
            {TYPE_ICONS[item.type]}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                /{item.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  px: 0.5,
                  borderRadius: 0.5,
                  bgcolor: "action.hover",
                  color: TYPE_COLORS[item.type],
                  fontSize: 10,
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {item.type}
              </Typography>
              {item.category && (
                <Typography variant="caption" color="text.disabled" noWrap>
                  {item.category}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap>
              {item.description}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
