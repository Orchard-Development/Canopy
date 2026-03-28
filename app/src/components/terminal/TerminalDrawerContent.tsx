import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Stack,
  Button,
  Switch,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import GridViewIcon from "@mui/icons-material/GridView";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { SessionHistoryDialog } from "./SessionHistoryDialog";
import { SessionSummaryList } from "./SessionSummaryList";
import { TerminalPanel } from "./TerminalPanel";
import { TerminalGrid } from "./TerminalGrid";
import type { GridSpan } from "../ResizableGrid";
import { SessionStateDot, type SessionState } from "./SessionStateDot";
import { ProfileTooltip, type SessionProfile } from "./ProfileTooltip";

function commandName(command: string) {
  if (command === "claude") return "Claude";
  if (command === "codex") return "Codex";
  return "Terminal";
}

/** Build an occupancy grid, then expand each terminal right and down into empty cells. */
function computeGapFill(
  tabs: { id: string }[],
  spans: Record<string, GridSpan>,
  numCols: number,
  visibleRows: number,
  colMult: number,
  freeform: boolean,
): Record<string, GridSpan> {
  if (!freeform) {
    const rowsPer = Math.max(4, Math.floor(visibleRows / (tabs.length || 1)));
    const out: Record<string, GridSpan> = {};
    for (const t of tabs) out[t.id] = { col: numCols, row: rowsPer };
    return out;
  }

  type Pos = { id: string; cs: number; rs: number; c: number; r: number };
  const items: Pos[] = [];
  const unpinned: { id: string; c: number; r: number }[] = [];

  for (const tab of tabs) {
    const s = spans[tab.id] ?? { col: colMult, row: 4 };
    if (s.colStart !== undefined && s.rowStart !== undefined) {
      items.push({ id: tab.id, cs: s.colStart, rs: s.rowStart, c: Math.min(s.col, numCols), r: s.row });
    } else {
      unpinned.push({ id: tab.id, c: Math.min(s.col ?? colMult, numCols), r: s.row ?? 4 });
    }
  }

  // Auto-place unpinned items (mimics CSS grid dense flow)
  const overlaps = (c: number, r: number, w: number, h: number) =>
    items.some(p => c < p.cs + p.c && c + w > p.cs && r < p.rs + p.r && r + h > p.rs);
  for (const u of unpinned) {
    let placed = false;
    for (let r = 1; r < 200 && !placed; r++) {
      for (let c = 1; c <= numCols - u.c + 1 && !placed; c++) {
        if (!overlaps(c, r, u.c, u.r)) {
          items.push({ id: u.id, cs: c, rs: r, c: u.c, r: u.r });
          placed = true;
        }
      }
    }
  }

  // Build occupancy grid
  let maxRow = visibleRows;
  for (const p of items) maxRow = Math.max(maxRow, p.rs + p.r - 1);
  const grid: (string | null)[][] = [];
  for (let r = 0; r <= maxRow; r++) grid[r] = new Array(numCols + 1).fill(null);
  for (const p of items) {
    for (let r = p.rs; r < p.rs + p.r; r++)
      for (let c = p.cs; c < p.cs + p.c; c++)
        if (grid[r]) grid[r][c] = p.id;
  }

  // Iteratively expand the smallest terminal first to normalize sizes
  let canExpand = true;
  let safety = 0;
  while (canExpand && safety++ < 2000) {
    canExpand = false;
    items.sort((a, b) => (a.c * a.r) - (b.c * b.r));
    for (const pos of items) {
      // Try right
      if (pos.cs + pos.c <= numCols) {
        let ok = true;
        for (let r = pos.rs; r < pos.rs + pos.r; r++) {
          if (grid[r]?.[pos.cs + pos.c] !== null) { ok = false; break; }
        }
        if (ok) {
          for (let r = pos.rs; r < pos.rs + pos.r; r++) grid[r][pos.cs + pos.c] = pos.id;
          pos.c++;
          canExpand = true;
          break;
        }
      }
      // Try down
      if (pos.rs + pos.r <= maxRow && grid[pos.rs + pos.r]) {
        let ok = true;
        for (let c = pos.cs; c < pos.cs + pos.c; c++) {
          if (grid[pos.rs + pos.r]?.[c] !== null) { ok = false; break; }
        }
        if (ok) {
          for (let c = pos.cs; c < pos.cs + pos.c; c++) grid[pos.rs + pos.r][c] = pos.id;
          pos.r++;
          canExpand = true;
          break;
        }
      }
      // Try left
      if (pos.cs > 1) {
        let ok = true;
        for (let r = pos.rs; r < pos.rs + pos.r; r++) {
          if (grid[r]?.[pos.cs - 1] !== null) { ok = false; break; }
        }
        if (ok) {
          for (let r = pos.rs; r < pos.rs + pos.r; r++) grid[r][pos.cs - 1] = pos.id;
          pos.cs--;
          pos.c++;
          canExpand = true;
          break;
        }
      }
      // Try up
      if (pos.rs > 1 && grid[pos.rs - 1]) {
        let ok = true;
        for (let c = pos.cs; c < pos.cs + pos.c; c++) {
          if (grid[pos.rs - 1]?.[c] !== null) { ok = false; break; }
        }
        if (ok) {
          for (let c = pos.cs; c < pos.cs + pos.c; c++) grid[pos.rs - 1][c] = pos.id;
          pos.rs--;
          pos.r++;
          canExpand = true;
          break;
        }
      }
    }
  }

  const out: Record<string, GridSpan> = {};
  for (const p of items) out[p.id] = { col: p.c, row: p.r, colStart: p.cs, rowStart: p.rs };
  return out;
}

export interface TerminalTab {
  id: string;
  label: string;
  command: string;
  nickname: string;
  exitCode?: number;
  projectId?: string;
  state?: SessionState;
  summary?: string;
  lastAiUpdate?: number;
  poker?: boolean;
  lastPokerFired?: number;
  cwd?: string;
  startedAt?: string;
  agentType?: string;
  source?: string;
  forkedFrom?: string;
  node?: string;
  lastPrompt?: string;
}

export interface TerminalPreset {
  label: string;
  command: string;
  args: string[];
  icon: React.ReactNode;
}

interface Props {
  activeTab: number;
  drawerDragging?: boolean;
  expanded: boolean;
  freeformGrid: boolean;
  gridMode: boolean;
  gridSpans: Record<string, GridSpan>;
  menuAnchor: HTMLElement | null;
  open: boolean;
  presets: TerminalPreset[];
  profiles?: Record<string, SessionProfile>;
  setActiveTab: (index: number) => void;
  setExpanded: (expanded: boolean) => void;
  setFreeformGrid: (freeform: boolean) => void;
  setGridMode: (mode: boolean) => void;
  setGridSpans: (spans: Record<string, GridSpan>) => void;
  setMenuAnchor: (anchor: HTMLElement | null) => void;
  tabs: TerminalTab[];
  onClose: () => void;
  onExit: (index: number, code: number) => void;
  onSpawn: (command: string, args: string[], label: string) => void;
  onTabClose: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onCardFocus?: (id: string) => void;
  onViewLog?: (sessionId: string) => void;
  onOpenLogFile?: (sessionId: string) => void;
  onAiSync?: (id: string, updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
  projectCwd?: string;
  projectFilterEnabled?: boolean;
  setProjectFilterEnabled?: (enabled: boolean) => void;
  hasActiveProject?: boolean;
  onRefresh?: () => void;
  /** When set, scroll to this session ID (e.g. from toast Focus button). */
  scrollToSessionId?: string | null;
}

export function TerminalDrawerContent({
  activeTab,
  drawerDragging,
  expanded,
  freeformGrid,
  gridMode,
  gridSpans,
  menuAnchor,
  open,
  presets,
  profiles,
  setActiveTab,
  setExpanded,
  setFreeformGrid,
  setGridMode,
  setGridSpans,
  setMenuAnchor,
  tabs,
  onClose,
  onExit,
  onSpawn,
  onTabClose,
  onCardFocus,
  onReorder,
  onViewLog,
  onOpenLogFile,
  onAiSync,
  onRefresh,
  projectCwd,
  projectFilterEnabled,
  setProjectFilterEnabled,
  hasActiveProject,
  scrollToSessionId,
}: Props) {
  const [summaryMode, setSummaryMode] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);
  const handleRefresh = () => {
    const tab = tabs[activeTab];
    if (tab) setRefreshKeys((prev) => ({ ...prev, [tab.id]: (prev[tab.id] || 0) + 1 }));
  };
  const handleRefreshAll = () => {
    setRefreshKeys((prev) => {
      const next: Record<string, number> = {};
      for (const tab of tabs) next[tab.id] = (prev[tab.id] || 0) + 1;
      return next;
    });
    setGlobalRefreshKey((k) => k + 1);
  };
  const [historyOpen, setHistoryOpen] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const prevTabCount = useRef(tabs.length);
  const [gridScrollToId, setGridScrollToId] = useState<string | null>(null);
  const prevOpen = useRef(open);
  useEffect(() => {
    if (tabs.length > prevTabCount.current && gridMode && gridScrollRef.current) {
      gridScrollRef.current.scrollTo({ top: gridScrollRef.current.scrollHeight, behavior: "smooth" });
    }
    prevTabCount.current = tabs.length;
  }, [tabs.length, gridMode]);

  // Listen for external grid-mode requests (e.g. guided tour)
  useEffect(() => {
    function handle(e: Event) {
      const { enabled } = (e as CustomEvent).detail;
      setGridMode(enabled);
    }
    window.addEventListener("ctx:terminal-grid", handle);
    return () => window.removeEventListener("ctx:terminal-grid", handle);
  }, [setGridMode]);

  // Scroll to the focused terminal when the drawer opens
  useEffect(() => {
    if (open && !prevOpen.current && gridMode && tabs.length > 0) {
      const focusedTab = tabs[activeTab];
      if (focusedTab) setGridScrollToId(focusedTab.id);
    }
    if (!open) setGridScrollToId(null);
    prevOpen.current = open;
  }, [open, gridMode, activeTab, tabs]);

  // Focus a session requested externally (e.g. toast Focus button)
  useEffect(() => {
    if (!scrollToSessionId) return;
    if (gridMode) {
      setGridScrollToId(scrollToSessionId);
    } else {
      const idx = tabs.findIndex((t) => t.id === scrollToSessionId);
      if (idx >= 0) setActiveTab(idx);
    }
  }, [scrollToSessionId, gridMode, tabs, setActiveTab]);

  const handleGridKill = useCallback((id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx >= 0) onTabClose(idx);
  }, [tabs, onTabClose]);

  const handleGridExit = useCallback((id: string, code: number) => {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx >= 0) onExit(idx, code);
  }, [tabs, onExit]);

  const applyLayout = useCallback((layoutCols: number, layoutRows: number) => {
    const container = gridScrollRef.current;
    if (!container) return;
    const GAP = 16;
    const ROW_HEIGHT = 75;
    const MIN_CELL_WIDTH = 400;
    const COL_MULT = 4;
    const gridWidth = container.clientWidth - 16;
    const logCols = Math.max(1, Math.floor((gridWidth + GAP) / (MIN_CELL_WIDTH + GAP)));
    const numCols = logCols * COL_MULT;
    const gridHeight = container.clientHeight - 16;
    const totalRows = Math.floor((gridHeight + GAP) / (ROW_HEIGHT + GAP));
    const colPer = Math.max(COL_MULT, Math.floor(numCols / layoutCols));
    const rowPer = Math.max(4, Math.floor(totalRows / layoutRows));
    const newSpans: Record<string, GridSpan> = {};
    for (const tab of tabs) {
      newSpans[tab.id] = { col: colPer, row: rowPer };
    }
    setGridSpans(newSpans);
  }, [tabs, setGridSpans]);

  if (tabs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
          px: 3,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Terminal
        </Typography>
        <Typography color="text.secondary" sx={{ textAlign: "center", fontSize: 14 }}>
          Run Claude Code, Codex, Orchard, or a shell alongside any view.
        </Typography>
        <Stack direction="column" spacing={1} sx={{ width: "100%" }}>
          {onRefresh && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              fullWidth
            >
              Refresh Sessions
            </Button>
          )}
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outlined"
              startIcon={preset.icon}
              onClick={() => onSpawn(preset.command, preset.args, preset.label)}
              fullWidth
            >
              {preset.label}
            </Button>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        {/* Row 1: Action icons */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minHeight: 36,
          }}
        >
          <Tooltip title={expanded ? "Collapse" : "Expand"}>
            <IconButton data-tour="tour-terminal-expand" size="small" onClick={() => setExpanded(!expanded)} sx={{ ml: 0.5 }}>
              {expanded ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {gridMode && !summaryMode && (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <Tooltip title="Fill gaps">
                <IconButton
                  size="small"
                  onClick={() => {
                    const container = gridScrollRef.current;
                    if (!container) return;
                    const GAP = 16;
                    const gw = container.clientWidth - 16;
                    const logCols = Math.max(1, Math.floor((gw + GAP) / (400 + GAP)));
                    const numCols = logCols * 4;
                    const gh = container.clientHeight - 16;
                    const visRows = Math.floor((gh + GAP) / (75 + GAP));
                    setGridSpans(computeGapFill(tabs, gridSpans, numCols, visRows, 4, freeformGrid));
                  }}
                  sx={{ mr: 0.5 }}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Stack direction="row" spacing={0.25} sx={{ mr: 0.5 }}>
                {([["1x1", 1, 1, "Full"], ["2x1", 2, 1, "Wide"], ["1x2", 1, 2, "Tall"], ["2x2", 2, 2, "Grid"]] as const).map(([label, c, r, tip]) => (
                  <Tooltip key={label} title={tip}>
                    <Chip
                      label={label}
                      size="small"
                      onClick={() => applyLayout(c, r)}
                      sx={{ height: 20, fontSize: 10, cursor: "pointer", "& .MuiChip-label": { px: 0.5 } }}
                    />
                  </Tooltip>
                ))}
              </Stack>
              <Tooltip title={freeformGrid ? "Freeform layout" : "Structured layout"}>
                <Stack data-tour="tour-terminal-freeform" direction="row" alignItems="center" spacing={0} sx={{ mr: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    {freeformGrid ? "Free" : "Grid"}
                  </Typography>
                  <Switch
                    size="small"
                    checked={freeformGrid}
                    onChange={(_, checked) => setFreeformGrid(checked)}
                    sx={{ "& .MuiSwitch-switchBase": { p: 0.5 }, "& .MuiSwitch-thumb": { width: 12, height: 12 } }}
                  />
                </Stack>
              </Tooltip>
            </Box>
          )}
          {!gridMode && <Box sx={{ flex: 1 }} />}
          {hasActiveProject && setProjectFilterEnabled && (
            <Tooltip title={projectFilterEnabled ? "Showing project sessions -- click to show all" : "Showing all sessions -- click to filter by project"}>
              <IconButton
                size="small"
                onClick={() => setProjectFilterEnabled(!projectFilterEnabled)}
                color={projectFilterEnabled ? "primary" : "default"}
                sx={{ mr: 0.5 }}
              >
                {projectFilterEnabled ? <FilterAltIcon fontSize="small" /> : <FilterAltOffIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Session history">
            <IconButton size="small" onClick={() => setHistoryOpen(true)} sx={{ mr: 0.5 }}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton
            data-tour="tour-terminal-add"
            size="small"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={{ mr: 0.5 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          {!gridMode && onViewLog && tabs[activeTab] && tabs[activeTab].exitCode === undefined && (
            <Tooltip title="View session log">
              <IconButton size="small" onClick={() => onViewLog(tabs[activeTab].id)} sx={{ mr: 0.5 }}>
                <ArticleOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!gridMode && (
            <Tooltip title="Refresh terminal">
              <IconButton size="small" onClick={handleRefresh} sx={{ mr: 0.5 }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh all terminals">
            <IconButton size="small" onClick={handleRefreshAll} sx={{ mr: 0.5 }}>
              <RefreshIcon fontSize="small" color="primary" />
            </IconButton>
          </Tooltip>
          <Tooltip title={summaryMode ? "Exit summary view" : "Summary view"}>
            <IconButton
              size="small"
              onClick={() => setSummaryMode(!summaryMode)}
              color={summaryMode ? "primary" : "default"}
              sx={{ mr: 0.5 }}
            >
              <ListAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!summaryMode && (
            <Tooltip title={gridMode ? "Tab view" : "Grid view"}>
              <IconButton data-tour="tour-terminal-grid" size="small" onClick={() => setGridMode(!gridMode)} sx={{ mr: 0.5 }}>
                {gridMode ? <ViewStreamIcon fontSize="small" /> : <GridViewIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={onClose} sx={{ mr: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            {presets.map((preset) => (
              <MenuItem
                key={preset.label}
                onClick={() => onSpawn(preset.command, preset.args, preset.label)}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  {preset.icon}
                  <span>{preset.label}</span>
                </Stack>
              </MenuItem>
            ))}
          </Menu>
        </Box>
        {/* Row 2: Tabs (tab mode only) */}
        {!gridMode && !summaryMode && (
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                minHeight: 28,
                minWidth: 0,
                py: 0,
                px: 0,
                mr: 0.5,
                my: 0.5,
                textTransform: "none",
              },
            }}
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeTab;
              const label = tab.label || `${commandName(tab.command)} ${tab.nickname}`;
              const resolvedState = tab.exitCode !== undefined ? "idle" : (tab.state ?? "running");
              const profile = profiles?.[tab.id];
              return (
                <Tab
                  key={tab.id}
                  sx={(t) => ({
                    bgcolor: isActive
                      ? alpha(t.palette.primary.main, 0.18)
                      : "transparent",
                    borderRadius: 1,
                    overflow: "visible",
                    transition: "all 0.15s",
                    opacity: isActive ? 1 : 0.6,
                    border: isActive
                      ? `1.5px solid ${alpha(t.palette.primary.main, 0.5)}`
                      : profile?.color
                        ? `1.5px solid ${profile.color}30`
                        : "1.5px solid transparent",
                    boxShadow: isActive
                      ? `0 0 8px ${alpha(t.palette.primary.main, 0.35)}`
                      : "none",
                    "&:hover": {
                      bgcolor: isActive
                        ? alpha(t.palette.primary.main, 0.28)
                        : "action.hover",
                      opacity: 1,
                    },
                    "&:hover .tab-close": { opacity: 1 },
                  })}
                  label={
                    <Tooltip title={<ProfileTooltip profile={profile} label={label} sessionId={tab.id} lastAiUpdate={tab.lastAiUpdate} summary={tab.summary} onSync={(u) => onAiSync?.(tab.id, u)} />} enterDelay={300} placement="bottom-start">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, position: "relative" }}>
                        <SessionStateDot state={resolvedState} size={7} />
                        {tab.poker && (
                          <Tooltip title="Poker enabled -- AI will follow up after inactivity">
                            <AutoFixHighIcon sx={{ fontSize: 12, color: "warning.main", opacity: tab.lastPokerFired && Date.now() - tab.lastPokerFired < 2000 ? 1 : 0.7 }} />
                          </Tooltip>
                        )}
                        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{ maxWidth: 160, lineHeight: 1, fontWeight: isActive ? 600 : 400 }}
                          >
                            {label}
                          </Typography>
                          {profile?.one_liner && !label.toLowerCase().startsWith(profile.one_liner.toLowerCase().slice(0, 12)) && (
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{ fontSize: "0.65rem", color: "text.secondary", maxWidth: 160 }}
                            >
                              {profile.one_liner}
                            </Typography>
                          )}
                        </Box>
                        {tab.exitCode !== undefined && (
                          <Chip
                            size="small"
                            label={tab.exitCode}
                            color={tab.exitCode === 0 ? "success" : "error"}
                            sx={{ height: 16, fontSize: 10, "& .MuiChip-label": { px: 0.5 } }}
                          />
                        )}
                        {tab.node && (
                          <Chip
                            size="small"
                            label={`@${tab.node.split("@")[0] || tab.node}`}
                            sx={{
                              height: 16,
                              fontSize: 9,
                              fontFamily: "monospace",
                              "& .MuiChip-label": { px: 0.5 },
                              bgcolor: "info.main",
                              color: "info.contrastText",
                            }}
                          />
                        )}
                        <IconButton
                          className="tab-close"
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            onTabClose(index);
                          }}
                          sx={{ p: 0.25, opacity: 0, position: "absolute", right: -6, top: -6, transition: "opacity 0.15s", bgcolor: "background.paper", borderRadius: "50%", zIndex: 1 }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  }
                />
              );
            })}
          </Tabs>
        )}
      </Box>

      {summaryMode ? (
        <SessionSummaryList
          tabs={tabs}
          profiles={profiles}
          onCardFocus={(id) => {
            setSummaryMode(false);
            onCardFocus?.(id);
          }}
          onKill={onTabClose}
          onViewLog={onViewLog}
          onOpenLogFile={onOpenLogFile}
          onAiSync={onAiSync}
        />
      ) : gridMode ? (
        <Box ref={gridScrollRef} sx={{ flex: 1, overflow: "auto", p: 1 }}>
          <TerminalGrid
            tabs={tabs}
            profiles={profiles}
            columns="auto"
            freeform={freeformGrid}
            initialSpans={gridSpans}
            onSpansChange={setGridSpans}
            onReorder={onReorder}
            onCardFocus={onCardFocus}
            onKill={handleGridKill}
            onExit={handleGridExit}
            scrollToId={gridScrollToId}
            onViewLog={onViewLog}
            onOpenLogFile={onOpenLogFile}
            onAiSync={onAiSync}
            externalRefreshKey={globalRefreshKey}
          />
        </Box>
      ) : (
        <Box sx={{ flex: 1, position: "relative" }}>
          {tabs[activeTab]?.summary && (
            <Box sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5, py: 0.5,
              bgcolor: "action.hover",
              borderBottom: 1,
              borderColor: "divider",
              fontSize: 12,
              color: "text.secondary",
              fontStyle: "italic",
            }}>
              <Box sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tabs[activeTab].summary}
              </Box>
              {onViewLog && (
                <Tooltip title="View session transcript">
                  <IconButton size="small" onClick={() => onViewLog(tabs[activeTab].id)} sx={{ p: 0.25, flexShrink: 0 }}>
                    <ArticleOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {onOpenLogFile && (
                <Tooltip title="Open log file">
                  <IconButton size="small" onClick={() => onOpenLogFile(tabs[activeTab].id)} sx={{ p: 0.25, flexShrink: 0 }}>
                    <FolderOpenIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
          {tabs.map((tab, index) => (
            <Box
              key={tab.id}
              sx={{
                position: "absolute",
                inset: 0,
                top: tabs[activeTab]?.summary ? 28 : 0,
                display: index === activeTab ? "block" : "none",
              }}
            >
              <TerminalPanel
                key={`${tab.id}-${refreshKeys[tab.id] || 0}`}
                sessionId={tab.id}
                active={open && index === activeTab}
                suspendResize={drawerDragging}
                onExit={(code) => onExit(index, code)}
              />
            </Box>
          ))}
        </Box>
      )}
      <SessionHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} projectCwd={projectCwd} />
    </Box>
  );
}
