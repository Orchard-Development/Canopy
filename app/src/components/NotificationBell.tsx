import { useState } from "react";
import {
  IconButton, Badge, Popover, Box, Typography,
  Button, Tooltip, Chip, Collapse, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloseIcon from "@mui/icons-material/Close";
import { useEvents, type EngineEvent, type EventActionMeta } from "../hooks/useEventBus";
import { useSettingsContext } from "../contexts/SettingsContext";
import {
  groupByDay, collapseToSummaries, formatExactTime, formatRelativeTime,
  actionLabel, formatCategory, SEVERITY_COLOR,
  type DayGroup as DayGroupType, type SummaryRow as SummaryRowType,
} from "./notificationBellHelpers";

// -- Shared sub-components ---------------------------------------------------

function SeverityDot({ severity }: { severity: string }) {
  return (
    <Box sx={{
      width: 8, height: 8, borderRadius: "50%",
      bgcolor: SEVERITY_COLOR[severity as keyof typeof SEVERITY_COLOR] || "info.main",
      flexShrink: 0, mt: "5px",
    }} />
  );
}

function EventRow({
  event, onAction, showDetail,
}: {
  event: EngineEvent;
  onAction: (meta: EventActionMeta) => void;
  showDetail?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1, px: 1.5, py: 0.75 }}>
      <SeverityDot severity={event.severity} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontSize: 13, flex: 1, minWidth: 0, wordBreak: "break-word" }}>
            {event.message}
            {event.dedupCount && event.dedupCount > 1 && (
              <Typography component="span" sx={{ fontSize: 11, color: "text.secondary", ml: 0.5 }}>
                (x{event.dedupCount})
              </Typography>
            )}
          </Typography>
          {event.actionMeta && (
            <Button size="small" sx={{ textTransform: "none", fontSize: 11, py: 0, px: 0.5, minWidth: 0, flexShrink: 0 }}
              onClick={() => onAction(event.actionMeta!)}>
              {actionLabel(event.actionMeta)}
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
          <Chip label={formatCategory(event.category)} size="small" variant="outlined"
            sx={{ fontSize: 10, height: 16, "& .MuiChip-label": { px: 0.75 } }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {formatExactTime(event.timestamp)}
          </Typography>
        </Box>
        {showDetail && event.data && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.25, display: "block" }}>
            {event.data.tool_name ? `Tool: ${String(event.data.tool_name)}` : null}
            {event.data.path ? ` \u00b7 ${String(event.data.path)}` : null}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// -- Needs Attention Section -------------------------------------------------

function NeedsAttentionSection({
  events, onAction, onDismiss,
}: {
  events: EngineEvent[];
  onAction: (meta: EventActionMeta) => void;
  onDismiss: (id: number) => void;
}) {
  if (events.length === 0) return null;
  return (
    <Box sx={{ borderLeft: 3, borderColor: "error.main" }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: "action.hover" }}>
        <Typography variant="caption" fontWeight={700} color="error.main" sx={{ textTransform: "uppercase", fontSize: 11 }}>
          Needs Attention
        </Typography>
      </Box>
      {events.map((event) => (
        <Box key={event.id} sx={{ position: "relative", borderTop: 1, borderColor: "divider" }}>
          <EventRow event={event} onAction={onAction} />
          <IconButton
            size="small"
            onClick={() => onDismiss(event.id)}
            sx={{ position: "absolute", top: 4, right: 4, opacity: 0.4, "&:hover": { opacity: 1 }, p: 0.25 }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}

// -- Activity Section --------------------------------------------------------

function SummaryRowView({
  row, onAction, onExpand, expanded,
}: {
  row: SummaryRowType;
  onAction: (meta: EventActionMeta) => void;
  onExpand: () => void;
  expanded: boolean;
}) {
  const isSingle = row.count === 1;
  if (isSingle) {
    return <EventRow event={row.events[0]} onAction={onAction} />;
  }
  return (
    <Box>
      <Box
        onClick={onExpand}
        sx={{ display: "flex", gap: 1, px: 1.5, py: 0.75, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
      >
        <SeverityDot severity={row.severity} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontSize: 13 }}>{row.label}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
            <Chip label={formatCategory(row.category)} size="small" variant="outlined"
              sx={{ fontSize: 10, height: 16, "& .MuiChip-label": { px: 0.75 } }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {formatRelativeTime(row.latestTimestamp)}
            </Typography>
          </Box>
        </Box>
        {expanded
          ? <ExpandLessIcon sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }} />
          : <ExpandMoreIcon sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }} />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ pl: 2, borderLeft: 1, borderColor: "divider", ml: 1.5 }}>
          {row.events.map((e) => (
            <EventRow key={e.id} event={e} onAction={onAction} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

function DayGroupSection({
  group, mode, defaultExpanded, onAction,
}: {
  group: DayGroupType;
  mode: "summary" | "detailed";
  defaultExpanded: boolean;
  onAction: (meta: EventActionMeta) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const summaries = mode === "summary" ? collapseToSummaries(group.events) : null;

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, py: 0.75, cursor: "pointer", bgcolor: "action.hover",
          "&:hover": { bgcolor: "action.selected" },
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {group.label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{group.events.length}</Typography>
          {expanded
            ? <ExpandLessIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            : <ExpandMoreIcon sx={{ fontSize: 14, color: "text.secondary" }} />}
        </Box>
      </Box>
      <Collapse in={expanded}>
        {mode === "summary" && summaries
          ? summaries.map((row, idx) => (
              <Box key={`${row.category}-${idx}`} sx={{ borderTop: 1, borderColor: "divider" }}>
                <SummaryRowView
                  row={row}
                  onAction={onAction}
                  expanded={expandedRows.has(`${row.category}-${idx}`)}
                  onExpand={() => toggleRow(`${row.category}-${idx}`)}
                />
              </Box>
            ))
          : group.events.map((event) => (
              <Box key={event.id} sx={{ borderTop: 1, borderColor: "divider" }}>
                <EventRow event={event} onAction={onAction} showDetail />
              </Box>
            ))}
      </Collapse>
    </Box>
  );
}

// -- Main Component ----------------------------------------------------------

export interface NotificationBellProps {
  onFocusSession?: (sessionId: string, label: string) => void;
  onViewProposal?: (slug: string) => void;
}

export function NotificationBell({ onFocusSession, onViewProposal }: NotificationBellProps) {
  const { events, unreadCount, markAllRead, dismissEvent, clearNoteworthy } = useEvents();
  const { settings, setSetting } = useSettingsContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const mode = (settings["notifications.bell.mode"] as "summary" | "detailed") || "summary";
  const setMode = (v: "summary" | "detailed") => setSetting("notifications.bell.mode", v);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markAllRead();
  };

  const handleAction = (meta: EventActionMeta) => {
    if (meta.type === "focus-session") onFocusSession?.(meta.sessionId, meta.label);
    else if (meta.type === "view-proposal") onViewProposal?.(meta.slug);
    setAnchorEl(null);
  };

  const criticalEvents = events.filter((e) => e.tier === "critical");
  const dayGroups = groupByDay(events);
  const hasAny = events.length > 0;

  const handleDismiss = (id: number) => dismissEvent(id);
  const handleClearActivity = () => clearNoteworthy();

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} size="small" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 400, maxHeight: 500 } } }}
      >
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" fontWeight={600}>Notifications</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {hasAny && (
              <>
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={(_, v) => v && setMode(v)}
                  size="small"
                  sx={{ height: 22 }}
                >
                  <ToggleButton value="summary" sx={{ fontSize: 10, px: 1, py: 0, textTransform: "none" }}>
                    Summary
                  </ToggleButton>
                  <ToggleButton value="detailed" sx={{ fontSize: 10, px: 1, py: 0, textTransform: "none" }}>
                    Detailed
                  </ToggleButton>
                </ToggleButtonGroup>
                <Button size="small" onClick={handleClearActivity} sx={{ textTransform: "none", fontSize: 12, py: 0 }}>
                  Clear
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ overflow: "auto", maxHeight: 440 }}>
          {!hasAny ? (
            <Box sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 120,
            }}>
              <NotificationsNoneIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary" variant="body2">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <>
              <NeedsAttentionSection
                events={criticalEvents}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
              {dayGroups.map((group, idx) => (
                <DayGroupSection
                  key={group.dateKey}
                  group={group}
                  mode={mode}
                  defaultExpanded={idx === 0}
                  onAction={handleAction}
                />
              ))}
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}
