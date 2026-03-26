import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";

const NAV_WIDTH = 72;

interface Props {
  open: boolean;
  side: "left" | "right";
  settingsPrefix: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidthRatio?: number;
  expanded?: boolean;
  glow?: boolean;
  onDraggingChange?: (dragging: boolean) => void;
  children: ReactNode;
}

/**
 * Shared resizable drawer shell used by EventMonitorDrawer and TerminalDrawer.
 * Sits in the page flex layout (not overlaid) with a drag-to-resize handle.
 */
export function ResizableDrawer({
  open,
  side,
  settingsPrefix,
  defaultWidth = 480,
  minWidth = 320,
  maxWidthRatio = 0.65,
  expanded = false,
  glow = false,
  onDraggingChange,
  children,
}: Props) {
  const onDraggingChangeRef = useRef(onDraggingChange);
  onDraggingChangeRef.current = onDraggingChange;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerWidth, setDrawerWidth] = useState(defaultWidth);
  const drawerWidthRef = useRef(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const saved = parseInt(data[`${settingsPrefix}.drawerWidth`], 10);
        if (!isNaN(saved) && saved >= minWidth) {
          setDrawerWidth(saved);
          drawerWidthRef.current = saved;
        }
      })
      .catch(() => {});
  }, [settingsPrefix, minWidth]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      setDragging(true);
      onDraggingChangeRef.current?.(true);
      const onMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const maxW = window.innerWidth * maxWidthRatio;
        const w =
          side === "left"
            ? Math.min(maxW, Math.max(minWidth, ev.clientX - NAV_WIDTH))
            : Math.min(maxW, Math.max(minWidth, window.innerWidth - ev.clientX));
        drawerWidthRef.current = w;
        setDrawerWidth(w);
      };
      const onUp = () => {
        draggingRef.current = false;
        setDragging(false);
        onDraggingChangeRef.current?.(false);
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [`${settingsPrefix}.drawerWidth`]: String(Math.round(drawerWidthRef.current)),
          }),
        }).catch(() => {});
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [side, settingsPrefix, minWidth, maxWidthRatio],
  );

  const fullWidth = `calc(100vw - ${NAV_WIDTH}px)`;
  const effectiveWidth = isMobile ? "100vw" : expanded ? fullWidth : drawerWidth;

  const borderSide = side === "left" ? "borderRight" : "borderLeft";
  const handleEdge = side === "left" ? "right" : "left";
  const mobileAnchor = side === "left" ? { left: 0 } : { right: 0 };

  return (
    <Box
      sx={{
        position: isMobile ? "fixed" : "relative",
        ...(isMobile && { top: 64, bottom: 0, zIndex: (t) => t.zIndex.drawer + 1, ...mobileAnchor }),
        flexShrink: 0,
        width: open ? effectiveWidth : 0,
        minWidth: open ? (isMobile ? "100vw" : expanded ? effectiveWidth : minWidth) : 0,
        maxWidth: open
          ? isMobile
            ? "100vw"
            : expanded
              ? "100vw"
              : `${maxWidthRatio * 100}vw`
          : 0,
        pt: isMobile ? 0 : 8,
        overflow: "hidden",
        [borderSide]: open && !isMobile ? (glow ? 3 : 1) : 0,
        borderColor: glow ? "primary.main" : "divider",
        bgcolor: "background.paper",
        boxShadow: glow ? 6 : "none",
        transition: dragging
          ? "none"
          : (t) =>
              t.transitions.create(["width", "min-width", "max-width", "border-color"], {
                duration: t.transitions.duration.shorter,
                easing: t.transitions.easing.easeInOut,
              }),
      }}
    >
      {open && !isMobile && !expanded && (
        <Box
          onMouseDown={handleDragStart}
          sx={{
            position: "absolute",
            [handleEdge]: 0,
            top: 64,
            bottom: 0,
            width: 5,
            cursor: "col-resize",
            zIndex: 10,
            "&:hover, &:active": { bgcolor: "primary.main", opacity: 0.5 },
            transition: "background-color 0.15s",
          }}
        />
      )}
      <Box
        sx={{
          width: effectiveWidth,
          minWidth: effectiveWidth,
          height: isMobile ? "100%" : "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {open ? children : null}
      </Box>
    </Box>
  );
}
