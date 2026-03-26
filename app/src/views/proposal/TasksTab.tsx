import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Paper,
  Card,
  CardContent,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { MarkdownContent } from "../../components/MarkdownContent";
import { TASK_ACCENT } from "./types";
import type { TaskFile } from "./types";

export function TasksTab({
  tasks,
  selected,
  onSelect,
  onBuild,
  onEdit,
  busy,
}: {
  tasks: TaskFile[];
  selected: TaskFile | null;
  onSelect: (t: TaskFile | null) => void;
  onBuild: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [expanded, setExpanded] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const accentColor = (status: string) => {
    const key = TASK_ACCENT[status] ?? "grey.500";
    const [palette, shade] = key.split(".");
    return (theme.palette as unknown as Record<string, Record<string, string>>)[palette]?.[shade] ?? theme.palette.grey[500];
  };

  return (
    <Stack direction={isMobile ? "column" : "row"} spacing={2} sx={{ minHeight: isMobile ? 0 : 400 }}>
      <Box
        ref={listRef}
        onClick={() => { if (!expanded) setExpanded(true); }}
        sx={{
          width: isMobile ? "100%" : (expanded ? 320 : 80),
          flexShrink: 0,
          overflow: "auto",
          maxHeight: isMobile ? 300 : undefined,
          transition: "width 0.25s ease",
          cursor: expanded ? "default" : "pointer",
        }}
      >
        <Stack spacing={0.75}>
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              isSelected={selected?.id === t.id}
              expanded={expanded}
              busy={busy}
              accentColor={accentColor(t.status)}
              onSelect={() => { onSelect(t); if (!expanded) setExpanded(true); }}
              onEdit={() => onEdit(t.id)}
              onBuild={() => onBuild(t.id)}
            />
          ))}
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ flex: 1, p: isMobile ? 2 : 3, overflow: "auto" }}>
        <MarkdownContent content={selected?.content ?? ""} />
      </Paper>
    </Stack>
  );
}

function TaskCard({
  task: t,
  isSelected,
  expanded,
  busy,
  accentColor: color,
  onSelect,
  onEdit,
  onBuild,
}: {
  task: TaskFile;
  isSelected: boolean;
  expanded: boolean;
  busy: boolean;
  accentColor: string;
  onSelect: () => void;
  onEdit: () => void;
  onBuild: () => void;
}) {
  return (
    <Card
      variant="outlined"
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      sx={{
        cursor: "pointer",
        borderLeft: 4,
        borderLeftColor: color,
        borderColor: isSelected ? color : undefined,
        borderWidth: isSelected ? 2 : 1,
        borderLeftWidth: 4,
        bgcolor: isSelected ? alpha(color, 0.08) : "transparent",
        "&:hover": { borderColor: "primary.main", borderLeftWidth: 4, borderLeftColor: color },
        transition: "background-color 0.2s ease",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ py: 0.75, px: expanded ? 1.5 : 0.75, "&:last-child": { pb: 0.75 } }}>
        {expanded ? <ExpandedContent task={t} busy={busy} onEdit={onEdit} onBuild={onBuild} /> : (
          <Tooltip title={`${t.id}: ${t.name}`} placement="right" arrow>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.85rem" }}>
                {t.id}
              </Typography>
              <Stack direction="row" spacing={0.25}>
                <Tooltip title="Edit with AI">
                  <span>
                    <Button size="small" variant="outlined" disabled={busy} onClick={(e) => { e.stopPropagation(); onEdit(); }} sx={{ minWidth: 0, px: 0.5, height: 20 }}>
                      <EditIcon sx={{ fontSize: 11 }} />
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Build with AI">
                  <span>
                    <Button size="small" variant="outlined" disabled={busy || t.status === "completed"} onClick={(e) => { e.stopPropagation(); onBuild(); }} sx={{ minWidth: 0, px: 0.5, height: 20 }}>
                      <RocketLaunchIcon sx={{ fontSize: 11 }} />
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
}

function ExpandedContent({
  task: t,
  busy,
  onEdit,
  onBuild,
}: {
  task: TaskFile;
  busy: boolean;
  onEdit: () => void;
  onBuild: () => void;
}) {
  return (
    <>
      <Typography variant="body2" fontWeight={600} noWrap>
        {t.id}: {t.name}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
        <Chip label={t.agent} size="small" sx={{ fontSize: "0.65rem", height: 18 }} />
        {t.model && t.model !== "default" && (
          <Chip label={t.model} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
        )}
        {(t.dependsOn?.length ?? 0) > 0 && (
          <Tooltip title={`Depends on: ${t.dependsOn.join(", ")}`}>
            <Chip label={`deps: ${t.dependsOn.join(",")}`} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Edit with AI">
          <span>
            <Button size="small" variant="outlined" disabled={busy} onClick={(e) => { e.stopPropagation(); onEdit(); }} sx={{ minWidth: 0, px: 0.5, height: 22 }}>
              <EditIcon sx={{ fontSize: 12 }} />
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Build with AI">
          <span>
            <Button size="small" variant="outlined" disabled={busy || t.status === "completed"} onClick={(e) => { e.stopPropagation(); onBuild(); }} sx={{ minWidth: 0, px: 0.5, height: 22 }}>
              <RocketLaunchIcon sx={{ fontSize: 12 }} />
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </>
  );
}
