import { useState, useEffect, useMemo } from "react";
import {
  Box,
  List,
  ListItemButton,
  Typography,
  TextField,
  InputAdornment,
  Skeleton,
  IconButton,
  Popover,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { api, type IntelItem } from "../../lib/api";

export type IntelKind = "rule" | "skill" | "memory";

export interface TaggedItem extends IntelItem {
  kind: IntelKind;
}

interface Props {
  projectId: string;
  selected: TaggedItem | null;
  onSelect: (item: TaggedItem | null) => void;
  generation: number;
}

const KIND_COLORS: Record<IntelKind, string> = {
  rule: "primary.main",
  skill: "secondary.main",
  memory: "warning.main",
};

export function IntelFileList({ projectId, selected, onSelect, generation }: Props) {
  const [rules, setRules] = useState<IntelItem[]>([]);
  const [skills, setSkills] = useState<IntelItem[]>([]);
  const [memory, setMemory] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<IntelKind | "all">("all");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState<Set<IntelKind>>(new Set(["rule", "skill", "memory"]));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.listRules(projectId),
      api.listSkills(projectId),
      api.listMemory(projectId),
    ])
      .then(([r, s, m]) => { setRules(r); setSkills(s); setMemory(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, generation]);

  const items = useMemo(() => {
    const all: TaggedItem[] = [
      ...rules.map((r) => ({ ...r, kind: "rule" as const })),
      ...skills.map((s) => ({ ...s, kind: "skill" as const })),
      ...memory.map((m) => ({ ...m, kind: "memory" as const })),
    ];
    return all.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
  }, [rules, skills, memory, search, filter]);

  const grouped = useMemo(() => {
    const map: Record<IntelKind, TaggedItem[]> = { rule: [], skill: [], memory: [] };
    for (const item of items) map[item.kind].push(item);
    return map;
  }, [items]);

  function toggleGroup(kind: IntelKind) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });
  }

  const isSelected = (item: TaggedItem) =>
    selected?.kind === item.kind && selected?.name === item.name;

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={28} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  const groups: Array<{ kind: IntelKind; label: string }> = [
    { kind: "rule", label: "Rules" },
    { kind: "skill", label: "Skills" },
    { kind: "memory", label: "Memory" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, pt: 1, pb: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
              sx: { height: 32 },
            },
          }}
        />
        <IconButton
          size="small"
          onClick={(e) => setFilterAnchor(filterAnchor ? null : e.currentTarget)}
          color={filter !== "all" ? "primary" : "default"}
          sx={{ flexShrink: 0 }}
        >
          <FilterListIcon fontSize="small" />
        </IconButton>
        <Popover
          open={!!filterAnchor}
          anchorEl={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { p: 1 } } }}
        >
          <ToggleButtonGroup
            value={filter}
            exclusive
            size="small"
            orientation="vertical"
            onChange={(_, v) => { if (v) setFilter(v); setFilterAnchor(null); }}
          >
            <ToggleButton value="all" sx={{ fontSize: "0.75rem", justifyContent: "flex-start" }}>
              All ({rules.length + skills.length + memory.length})
            </ToggleButton>
            <ToggleButton value="rule" sx={{ fontSize: "0.75rem", justifyContent: "flex-start" }}>
              Rules ({rules.length})
            </ToggleButton>
            <ToggleButton value="skill" sx={{ fontSize: "0.75rem", justifyContent: "flex-start" }}>
              Skills ({skills.length})
            </ToggleButton>
            <ToggleButton value="memory" sx={{ fontSize: "0.75rem", justifyContent: "flex-start" }}>
              Memory ({memory.length})
            </ToggleButton>
          </ToggleButtonGroup>
        </Popover>
      </Box>

      <List dense disablePadding sx={{ flex: 1, overflow: "auto", px: 0.5 }}>
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2, textAlign: "center" }}>
            {search ? "No matches" : "No intelligence files yet"}
          </Typography>
        )}
        {groups.map(({ kind, label }) => {
          const group = grouped[kind];
          if (group.length === 0) return null;
          const open = expanded.has(kind);
          return (
            <Box key={kind}>
              <ListItemButton
                onClick={() => toggleGroup(kind)}
                sx={{ borderRadius: 1, py: 0.25, mb: 0.25 }}
              >
                {open
                  ? <ExpandMoreIcon sx={{ fontSize: 16, mr: 0.5, color: KIND_COLORS[kind] }} />
                  : <ChevronRightIcon sx={{ fontSize: 16, mr: 0.5, color: KIND_COLORS[kind] }} />
                }
                <Typography variant="caption" fontWeight={700} sx={{ color: KIND_COLORS[kind], flex: 1 }}>
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {group.length}
                </Typography>
              </ListItemButton>
              <Collapse in={open}>
                {group.map((item) => (
                  <ListItemButton
                    key={`${item.kind}-${item.name}`}
                    selected={isSelected(item)}
                    onClick={() => onSelect(isSelected(item) ? null : item)}
                    sx={{ borderRadius: 1, py: 0.25, pl: 3.5, mb: 0.25 }}
                  >
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        fontWeight: isSelected(item) ? 700 : 500,
                        color: KIND_COLORS[kind],
                        fontSize: "0.8rem",
                      }}
                    >
                      {item.name}
                    </Typography>
                  </ListItemButton>
                ))}
              </Collapse>
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
