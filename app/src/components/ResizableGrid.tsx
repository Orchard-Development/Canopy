import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useGridDrag } from "./grid-drag";

const DEFAULT_ROW_HEIGHT = 75;
const GAP = 16;
const DEFAULT_MIN_CELL_WIDTH = 400;

export type GridColumns = "auto" | "1" | "2" | "3" | "4" | "5" | "6";

export interface GridSpan {
  col: number;
  row: number;
  colStart?: number;
  rowStart?: number;
}

export interface GridItem {
  id: string;
}

export interface CardRenderProps {
  colSpan: number;
  rowSpan: number;
  isDragging: boolean;
  onResizeStart: (el: HTMLElement, e: React.MouseEvent, edge?: "left" | "right") => void;
  onReorderStart: (el: HTMLElement, e: React.MouseEvent) => void;
  cardRef: (el: HTMLElement | null) => void;
}

interface Props<T extends GridItem> {
  items: T[];
  columns: GridColumns;
  freeform?: boolean;
  rowHeight?: number;
  defaultRowSpan?: number;
  colMultiplier?: number;
  minCellWidth?: number;
  initialSpans?: Record<string, GridSpan>;
  onSpansChange?: (spans: Record<string, GridSpan>) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onItemFocus?: (id: string) => void;
  scrollToId?: string | null;
  renderCard: (item: T, props: CardRenderProps) => React.ReactNode;
}

export function ResizableGrid<T extends GridItem>({
  items,
  columns,
  freeform = false,
  rowHeight = DEFAULT_ROW_HEIGHT,
  defaultRowSpan = 1,
  colMultiplier = 1,
  minCellWidth = DEFAULT_MIN_CELL_WIDTH,
  initialSpans,
  onSpansChange,
  onReorder,
  onItemFocus,
  scrollToId,
  renderCard,
}: Props<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [spans, setSpans] = useState<Record<string, GridSpan>>(initialSpans ?? {});
  const [autoCols, setAutoCols] = useState(2);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const logicalCols = columns === "auto" ? autoCols : Number(columns);
  const numCols = logicalCols * colMultiplier;

  useEffect(() => {
    if (initialSpans) setSpans(initialSpans);
  }, [initialSpans]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || columns !== "auto") return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setAutoCols(Math.max(1, Math.floor((w + GAP) / (minCellWidth + GAP))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [columns, minCellWidth]);

  const getCellWidth = useCallback(() => {
    if (!gridRef.current) return minCellWidth;
    return (gridRef.current.clientWidth - (numCols - 1) * GAP) / numCols;
  }, [numCols, minCellWidth]);

  const getSpan = (id: string): GridSpan => spans[id] ?? { col: colMultiplier, row: defaultRowSpan };

  const { drag, reorderDrag, handleResizeStart, handleReorderStart, isDragging: checkDragging, cardElsRef } = useGridDrag({
    gridRef, spans, setSpans, numCols, rowHeight, colMultiplier, defaultRowSpan, getCellWidth, onSpansChange,
    freeform, items, onReorder,
  });

  useEffect(() => {
    if (!scrollToId) return;
    const el = cardElsRef.current.get(scrollToId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [scrollToId, cardElsRef]);

  const overlay = (() => {
    if (!drag || !gridRef.current) return null;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cardRect = drag.cardEl.getBoundingClientRect();
    const cw = getCellWidth();
    const sl = gridRef.current.scrollLeft;
    const st = gridRef.current.scrollTop;
    const left = drag.targetColStart !== undefined
      ? (drag.targetColStart - 1) * (cw + GAP)
      : cardRect.left - gridRect.left + sl;
    return {
      left,
      top: cardRect.top - gridRect.top + st,
      width: drag.targetCol * cw + Math.max(0, drag.targetCol - 1) * GAP,
      height: drag.targetRow * rowHeight + Math.max(0, drag.targetRow - 1) * GAP,
    };
  })();

  return (
    <Box
      ref={gridRef}
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${numCols}, 1fr)`,
        gridAutoRows: rowHeight,
        gridAutoFlow: "dense",
        gap: `${GAP}px`,
        position: "relative",
      }}
    >
      {items.map((item) => {
        const span = getSpan(item.id);
        const clampedCol = Math.min(span.col, numCols);
        const useFreePos = freeform && span.colStart;
        const gridColumn = useFreePos
          ? `${span.colStart} / span ${clampedCol}`
          : `span ${clampedCol}`;
        const gridRow = useFreePos && span.rowStart
          ? `${span.rowStart} / span ${span.row}`
          : `span ${span.row}`;
        const isBeingDragged = checkDragging(item.id);
        const isFocused = freeform && focusedId === item.id;
        return (
          <Box
            key={item.id}
            data-grid-item
            onMouseDownCapture={(e) => {
              const ne = e.nativeEvent as MouseEvent & { _gridFocusHandled?: boolean };
              if (ne._gridFocusHandled) return;
              ne._gridFocusHandled = true;
              if (freeform) setFocusedId(item.id);
              onItemFocus?.(item.id);
            }}
            sx={{
              gridColumn,
              gridRow,
              ...(isBeingDragged && freeform && { display: "none" }),
              ...(isBeingDragged && !freeform && { opacity: 0.3, pointerEvents: "none" }),
              ...(freeform && { zIndex: isFocused ? 5 : 1 }),
            }}
          >
            {renderCard(item, {
              colSpan: clampedCol,
              rowSpan: span.row,
              isDragging: isBeingDragged ?? false,
              onResizeStart: (el, e, edge) => handleResizeStart(item.id, el, e, edge),
              onReorderStart: (el, e) => handleReorderStart(item.id, el, e),
              cardRef: (el) => {
                if (el) {
                  cardElsRef.current.set(item.id, el);
                } else {
                  cardElsRef.current.delete(item.id);
                }
              },
            })}
          </Box>
        );
      })}
      {drag && overlay && (
        <Box
          sx={{
            position: "absolute",
            left: overlay.left,
            top: overlay.top,
            width: overlay.width,
            height: overlay.height,
            bgcolor: "primary.main",
            opacity: 0.15,
            border: 2,
            borderColor: "primary.main",
            borderRadius: 1,
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}
      {freeform && reorderDrag && gridRef.current && (() => {
        const span = getSpan(reorderDrag.dragId);
        const clampedCol = Math.min(span.col, numCols);
        const cw = getCellWidth();
        const left = (reorderDrag.targetColStart - 1) * (cw + GAP);
        const top = (reorderDrag.targetRowStart - 1) * (rowHeight + GAP);
        const width = clampedCol * cw + Math.max(0, clampedCol - 1) * GAP;
        const height = span.row * rowHeight + Math.max(0, span.row - 1) * GAP;
        return (
          <Box
            sx={{
              position: "absolute",
              left, top, width, height,
              bgcolor: "primary.main",
              opacity: 0.12,
              border: 2,
              borderColor: "primary.main",
              borderStyle: "dashed",
              borderRadius: 1,
              pointerEvents: "none",
              zIndex: 20,
            }}
          />
        );
      })()}
    </Box>
  );
}
