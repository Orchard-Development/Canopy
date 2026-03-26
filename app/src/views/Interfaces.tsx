import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  Tooltip,
  Stack,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DevicesIcon from "@mui/icons-material/Devices";
import LanguageIcon from "@mui/icons-material/Language";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { api } from "../lib/api";
import {
  NewSessionDialog,
  type NewTab,
  type NewWebTab,
  type NewRdpTab,
} from "../components/NewSessionDialog";
import {
  ResizableGrid,
  type GridColumns,
  type GridSpan,
  type CardRenderProps,
} from "../components/ResizableGrid";
import { usePersistedState } from "../hooks/usePersistedState";

const RdpCanvas = lazy(() =>
  import("../components/RdpCanvas").then((m) => ({ default: m.RdpCanvas })),
);
const BrowserFrame = lazy(() =>
  import("../components/BrowserFrame").then((m) => ({ default: m.BrowserFrame })),
);

export type InterfaceTab = NewWebTab | NewRdpTab;

function tabLabel(tab: InterfaceTab): string {
  if (tab.type === "web") return tab.title || tab.url;
  return `${tab.username}@${tab.hostname}`;
}

// ── Resize grip SVG ──────────────────────────────────────────────────

function ResizeGrip({
  corner,
  onMouseDown,
}: {
  corner: "left" | "right";
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const isLeft = corner === "left";
  return (
    <Box
      onMouseDown={onMouseDown}
      sx={{
        position: "absolute",
        bottom: 0,
        [corner]: 0,
        width: 20,
        height: 20,
        cursor: isLeft ? "nesw-resize" : "nwse-resize",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        opacity: 0.3,
        "&:hover": { opacity: 0.8 },
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        {isLeft ? (
          <>
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="1" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
          </>
        ) : (
          <>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </Box>
  );
}

// ── Reorder drag handle ──────────────────────────────────────────────

function ReorderHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <Box
      onMouseDown={onMouseDown}
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 14,
        height: "100%",
        cursor: "grab",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        opacity: 0,
        "&:hover": { opacity: 0.6, bgcolor: "action.hover" },
      }}
    >
      <svg width="6" height="20" viewBox="0 0 6 20">
        {[3, 7, 11, 13, 17].map((y) => (
          <g key={y}>
            <circle cx="1.5" cy={y} r="1" fill="currentColor" />
            <circle cx="4.5" cy={y} r="1" fill="currentColor" />
          </g>
        ))}
      </svg>
    </Box>
  );
}

// ── Interface Card ───────────────────────────────────────────────────

function InterfaceCard({
  tab,
  grid,
  onClose,
  onUrlChange,
  onTitleChange,
}: {
  tab: InterfaceTab;
  grid: CardRenderProps;
  onClose: () => void;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      elRef.current = el;
      grid.cardRef(el);
    },
    [grid],
  );

  function startResize(e: React.MouseEvent, edge?: "left" | "right") {
    if (elRef.current) grid.onResizeStart(elRef.current, e, edge);
  }
  function startReorder(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    if (elRef.current) grid.onReorderStart(elRef.current, e);
  }

  return (
    <Card
      ref={mergedRef}
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        gridColumn: `span ${grid.colSpan}`,
        gridRow: `span ${grid.rowSpan}`,
        transition: "opacity 150ms ease, transform 150ms ease, box-shadow 150ms ease",
        ...(grid.isDragging && {
          opacity: 0.5,
          transform: "scale(0.97)",
          boxShadow: 6,
          zIndex: 10,
        }),
      }}
    >
      <Box
        onMouseDown={startReorder}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 40,
          cursor: "grab",
        }}
      >
        {tab.type === "web" ? (
          <LanguageIcon fontSize="small" color="primary" />
        ) : (
          <DesktopWindowsIcon fontSize="small" color="secondary" />
        )}
        <Tooltip title={tabLabel(tab)} enterDelay={400}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
            {tabLabel(tab)}
          </Typography>
        </Tooltip>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <CardContent sx={{ flex: 1, p: 0, "&:last-child": { pb: 0 }, overflow: "hidden" }}>
        <Suspense fallback={null}>
          {tab.type === "web" ? (
            <BrowserFrame
              url={tab.url}
              onUrlChange={(u) => onUrlChange?.(u)}
              onTitleChange={(t) => onTitleChange?.(t)}
            />
          ) : (
            <RdpCanvas sessionId={tab.id} onDisconnect={onClose} />
          )}
        </Suspense>
      </CardContent>
      <ReorderHandle onMouseDown={startReorder} />
      <ResizeGrip corner="left" onMouseDown={(e) => startResize(e, "left")} />
      <ResizeGrip corner="right" onMouseDown={(e) => startResize(e, "right")} />
    </Card>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────

function Toolbar({
  columns,
  onColumnsChange,
  onNew,
}: {
  columns: GridColumns;
  onColumnsChange: (c: GridColumns) => void;
  onNew: () => void;
}) {
  const theme = useTheme();
  const bg = theme.palette.background.default;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 2,
        position: "sticky",
        top: 0,
        zIndex: 10,
        py: 1,
        px: 1,
        mx: -1,
        backdropFilter: "blur(12px)",
        backgroundColor: bg.startsWith("#") ? `${bg}cc` : bg,
        borderBottom: 1,
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        Interfaces
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <ToggleButtonGroup
          value={columns}
          exclusive
          size="small"
          onChange={(_, val) => val && onColumnsChange(val)}
          sx={{ height: 32 }}
        >
          <ToggleButton value="auto">
            <ViewModuleIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="1">1</ToggleButton>
          <ToggleButton value="2">2</ToggleButton>
          <ToggleButton value="3">3</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onNew}>
          New
        </Button>
      </Stack>
    </Box>
  );
}

// ── Main view ────────────────────────────────────────────────────────

export default function Interfaces() {
  const [tabs, setTabs] = useState<InterfaceTab[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [columns, setColumns] = usePersistedState<string>("interfaces.columns", "auto");
  const [spans, setSpans] = usePersistedState<Record<string, unknown>>("interfaces.spans", {});
  const restoredRef = useRef(false);

  const handleSpansChange = useCallback((next: Record<string, GridSpan>) => {
    setSpans(next as Record<string, unknown>);
  }, [setSpans]);

  // Restore live RDP sessions on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    api.listRdpSessions().then((sessions) => {
      const alive = sessions.filter((s) => s.bridgeAlive);
      if (alive.length === 0) return;
      setTabs(alive.map((s): NewRdpTab => ({
        type: "rdp", id: s.id, hostname: s.hostname, username: s.username,
      })));
    }).catch(() => {});
  }, []);

  const handleConnect = useCallback((tab: NewTab) => {
    setDialogOpen(false);
    setTabs((prev) => [...prev, tab]);
  }, []);

  const handleClose = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.type === "rdp") api.deleteRdpSession(tab.id).catch(() => {});
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setSpans((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [tabs]);

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const handleWebUrlChange = useCallback((id: string, url: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id && t.type === "web" ? { ...t, url } : t)),
    );
  }, []);

  const handleWebTitleChange = useCallback((id: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id && t.type === "web" ? { ...t, title } : t)),
    );
  }, []);

  if (tabs.length === 0 && !dialogOpen) {
    return (
      <>
        <EmptyState onNew={() => setDialogOpen(true)} />
        <NewSessionDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConnect={handleConnect}
        />
      </>
    );
  }

  return (
    <Box sx={{ pt: 1, height: "calc(100vh - 88px)", overflow: "auto" }}>
      <Toolbar columns={columns as GridColumns} onColumnsChange={setColumns} onNew={() => setDialogOpen(true)} />
      <ResizableGrid
        items={tabs}
        columns={columns as GridColumns}
        rowHeight={400}
        minCellWidth={480}
        initialSpans={spans as Record<string, GridSpan>}
        onSpansChange={handleSpansChange}
        onReorder={handleReorder}
        renderCard={(tab, grid) => (
          <InterfaceCard
            key={tab.id}
            tab={tab}
            grid={grid}
            onClose={() => handleClose(tab.id)}
            onUrlChange={
              tab.type === "web" ? (u) => handleWebUrlChange(tab.id, u) : undefined
            }
            onTitleChange={
              tab.type === "web" ? (t) => handleWebTitleChange(tab.id, t) : undefined
            }
          />
        )}
      />
      <NewSessionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConnect={handleConnect}
      />
    </Box>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "calc(100vh - 120px)",
        gap: 3,
      }}
    >
      <DevicesIcon sx={{ fontSize: 64, color: "text.secondary" }} />
      <Typography variant="h5" fontWeight={600}>
        Interfaces
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 480, textAlign: "center" }}>
        Browse the web or connect to remote desktops without leaving the app.
        Interfaces appear in a grid so you can see multiple sessions at once.
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>
        New Interface
      </Button>
    </Box>
  );
}
