import { useRef, useEffect, useCallback } from "react";
import { Box } from "@mui/material";

interface ViewerRegionProps {
  onBoundsChange: (bounds: { x: number; y: number; width: number; height: number }) => void;
  onMouseEvent: (event: {
    localX: number;
    localY: number;
    button: "left" | "right" | "middle";
    type: "click" | "double_click";
  }) => void;
  onScroll: (event: {
    localX: number;
    localY: number;
    deltaX: number;
    deltaY: number;
  }) => void;
  attached: boolean;
}

const BUTTON_MAP = ["left", "middle", "right"] as const;

export function ViewerRegion({ onBoundsChange, onMouseEvent, onScroll, attached }: ViewerRegionProps) {
  const ref = useRef<HTMLDivElement>(null);

  const reportBounds = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    onBoundsChange({
      x: Math.round(rect.x + window.screenX),
      y: Math.round(rect.y + window.screenY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, [onBoundsChange]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(reportBounds);
    observer.observe(ref.current);
    reportBounds();
    return () => observer.disconnect();
  }, [reportBounds]);

  useEffect(() => {
    window.addEventListener("resize", reportBounds);
    return () => window.removeEventListener("resize", reportBounds);
  }, [reportBounds]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!attached || !ref.current) return;
      e.preventDefault();
      const rect = ref.current.getBoundingClientRect();
      onMouseEvent({
        localX: Math.round(e.clientX - rect.left),
        localY: Math.round(e.clientY - rect.top),
        button: BUTTON_MAP[e.button] ?? "left",
        type: "click",
      });
    },
    [attached, onMouseEvent],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!attached || !ref.current) return;
      e.preventDefault();
      const rect = ref.current.getBoundingClientRect();
      onMouseEvent({
        localX: Math.round(e.clientX - rect.left),
        localY: Math.round(e.clientY - rect.top),
        button: BUTTON_MAP[e.button] ?? "left",
        type: "double_click",
      });
    },
    [attached, onMouseEvent],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!attached || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      onScroll({
        localX: Math.round(e.clientX - rect.left),
        localY: Math.round(e.clientY - rect.top),
        deltaX: Math.round(e.deltaX),
        deltaY: Math.round(e.deltaY),
      });
    },
    [attached, onScroll],
  );

  return (
    <Box
      ref={ref}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        e.preventDefault();
        handleClick(e);
      }}
      sx={{
        flex: 1,
        minHeight: 300,
        background: attached ? "transparent" : "rgba(255,255,255,0.03)",
        border: "1px dashed",
        borderColor: attached ? "transparent" : "divider",
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: attached ? "default" : "auto",
        userSelect: "none",
      }}
    >
      {!attached && (
        <Box sx={{ color: "text.secondary", textAlign: "center", p: 4 }}>
          Select an application to embed
        </Box>
      )}
    </Box>
  );
}
