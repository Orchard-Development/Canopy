import { useState } from "react";
import { Box, Chip, Typography, Collapse } from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { HookEntry } from "../../hooks/useHookLog";
import { HookToolCallBubble } from "./HookToolCallBubble";

interface Props {
  entries: HookEntry[];
}

export type RenderItem =
  | { kind: "entry"; entry: HookEntry }
  | { kind: "tool_group"; entries: HookEntry[] };

export function groupToolEntries(entries: HookEntry[]): RenderItem[] {
  const result: RenderItem[] = [];
  let i = 0;
  while (i < entries.length) {
    if (entries[i].event_type === "tool") {
      const group: HookEntry[] = [];
      while (i < entries.length && entries[i].event_type === "tool") {
        group.push(entries[i]);
        i++;
      }
      result.push({ kind: "tool_group", entries: group });
    } else {
      result.push({ kind: "entry", entry: entries[i] });
      i++;
    }
  }
  return result;
}

export function ToolCallGroup({ entries }: Props) {
  const [expanded, setExpanded] = useState(false);
  const toolNames = entries.map((e) => e.tool_name ?? "unknown");
  const visibleChips = toolNames.slice(0, 4);
  const overflow = toolNames.length - visibleChips.length;

  return (
    <Box sx={{ ml: 4, my: 0.25 }}>
      <Box
        onClick={() => setExpanded((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          cursor: "pointer",
          py: 0.5,
          px: 1,
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <BuildIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
        <Box sx={{ display: "flex", gap: 0.5, flex: 1, minWidth: 0, overflow: "hidden" }}>
          {visibleChips.map((name, j) => (
            <Chip key={j} label={name} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
          ))}
          {overflow > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ alignSelf: "center", fontSize: 11 }}>
              +{overflow} more
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, fontSize: 11, mr: 0.5 }}>
          {entries.length} {entries.length === 1 ? "call" : "calls"}
        </Typography>
        <ExpandMoreIcon
          sx={{
            fontSize: 16,
            color: "text.secondary",
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        />
      </Box>
      <Collapse in={expanded}>
        {entries.map((entry, j) => (
          <HookToolCallBubble
            key={j}
            toolName={entry.tool_name ?? "unknown"}
            input={entry.metadata}
            result={entry.content}
            createdAt={entry.created_at}
          />
        ))}
      </Collapse>
    </Box>
  );
}
