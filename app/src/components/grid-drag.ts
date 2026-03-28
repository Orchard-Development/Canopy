import { useCallback, useRef, useState } from "react";
import type { GridSpan } from "./ResizableGrid";

const GAP = 16;
const MAX_ROW_SPAN = 40;
const SCROLL_THRESHOLD = 100;
const SCROLL_AMOUNT = 80;
const SCROLL_INTERVAL = 300;

/** Read all card grid positions from DOM without mutating state. */
function readGridPositions(
  cardEls: Map<string, HTMLElement>,
  gridEl: HTMLElement,
  cw: number,
  rowHeight: number,
  gap: number,
): Record<string, { colStart: number; rowStart: number }> {
  const gridRect = gridEl.getBoundingClientRect();
  const sl = gridEl.scrollLeft;
  const st = gridEl.scrollTop;
  const positions: Record<string, { colStart: number; rowStart: number }> = {};
  for (const [id, el] of cardEls) {
    const wrapper = el.closest("[data-grid-item]") as HTMLElement | null;
    if (!wrapper) continue;
    const rect = wrapper.getBoundingClientRect();
    positions[id] = {
      colStart: Math.max(1, Math.round((rect.left - gridRect.left + sl) / (cw + gap)) + 1),
      rowStart: Math.max(1, Math.round((rect.top - gridRect.top + st) / (rowHeight + gap)) + 1),
    };
  }
  return positions;
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflow, overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflow + overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

interface DragState {
  id: string;
  cardEl: HTMLElement;
  targetCol: number;
  targetRow: number;
  targetColStart?: number;
  targetRowStart?: number;
}

interface ReorderDragState {
  dragId: string;
  cardEl: HTMLElement;
  targetColStart: number;
  targetRowStart: number;
  grabOffsetX: number;
  grabOffsetY: number;
}

interface GridItem {
  id: string;
}

interface DragHookArgs {
  gridRef: React.RefObject<HTMLDivElement | null>;
  spans: Record<string, GridSpan>;
  setSpans: React.Dispatch<React.SetStateAction<Record<string, GridSpan>>>;
  numCols: number;
  rowHeight: number;
  colMultiplier: number;
  defaultRowSpan: number;
  getCellWidth: () => number;
  onSpansChange?: (spans: Record<string, GridSpan>) => void;
  freeform: boolean;
  items: GridItem[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

interface StructuredReorderState {
  dragId: string;
  lastOverId: string | null;
}

export function useGridDrag({
  gridRef, spans, setSpans, numCols, rowHeight, colMultiplier, defaultRowSpan, getCellWidth, onSpansChange,
  freeform, items, onReorder,
}: DragHookArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [reorderDrag, setReorderDrag] = useState<ReorderDragState | null>(null);
  const reorderDragRef = useRef<ReorderDragState | null>(null);
  const [structuredDragId, setStructuredDragId] = useState<string | null>(null);
  const structuredRef = useRef<StructuredReorderState | null>(null);
  const cardElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const handleResizeStart = useCallback(
    (id: string, cardEl: HTMLElement, e: React.MouseEvent, edge: "left" | "right" = "right") => {
      e.preventDefault();
      const span = spans[id] ?? { col: colMultiplier, row: defaultRowSpan };
      const initial: DragState = { id, cardEl, targetCol: span.col, targetRow: span.row };
      dragRef.current = initial;
      setDrag(initial);
      const cw = getCellWidth();
      const cardRect = cardEl.getBoundingClientRect();
      const scrollParent = findScrollParent(gridRef.current);
      const scrollStart = scrollParent ? scrollParent.scrollTop : 0;
      let scrollTimer: ReturnType<typeof setInterval> | null = null;
      let lastMouseX = e.clientX;
      let lastMouseY = e.clientY;

      // Pin grid position for freeform (so card stays put after resize)
      // and for left-edge resize (to anchor the right edge)
      let pinnedColStart: number | undefined;
      let pinnedRowStart: number | undefined;
      let anchorRightCol: number | undefined;
      if (freeform || edge === "left") {
        const gridEl = gridRef.current;
        if (gridEl) {
          const gridRect = gridEl.getBoundingClientRect();
          const wrapper = cardEl.closest("[data-grid-item]") as HTMLElement | null;
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            const relX = rect.left - gridRect.left + gridEl.scrollLeft;
            const relY = rect.top - gridRect.top + gridEl.scrollTop;
            pinnedColStart = Math.max(1, Math.round(relX / (cw + GAP)) + 1);
            pinnedRowStart = Math.max(1, Math.round(relY / (rowHeight + GAP)) + 1);
            if (edge === "left") anchorRightCol = pinnedColStart + span.col;
          }
        }
      }

      // Find horizontal neighbor to shrink instead of shift
      let neighbor: { id: string; colStart: number; col: number } | null = null;
      let allPositions: Record<string, { colStart: number; rowStart: number }> = {};
      const gridElSnap = gridRef.current;
      if (gridElSnap) {
        allPositions = readGridPositions(cardElsRef.current, gridElSnap, cw, rowHeight, GAP);
        const myPos = allPositions[id];
        if (myPos) {
          const searchCol = edge === "right"
            ? myPos.colStart + span.col
            : myPos.colStart - 1;
          if (searchCol >= 1 && searchCol <= numCols) {
            for (const [tid, tPos] of Object.entries(allPositions)) {
              if (tid === id) continue;
              const tSpan = spans[tid] ?? { col: colMultiplier, row: defaultRowSpan };
              const tColEnd = tPos.colStart + tSpan.col;
              const tRowEnd = tPos.rowStart + tSpan.row;
              if (tPos.colStart <= searchCol && tColEnd > searchCol &&
                  tPos.rowStart <= myPos.rowStart && tRowEnd > myPos.rowStart) {
                neighbor = { id: tid, colStart: tPos.colStart, col: tSpan.col };
                break;
              }
            }
          }
        }
      }
      const maxColGrowth = neighbor ? neighbor.col - 1 : Infinity;

      const updateDrag = () => {
        const scrollDelta = scrollParent ? scrollParent.scrollTop - scrollStart : 0;
        const dy = lastMouseY - cardRect.top + scrollDelta;
        const tr = Math.max(1, Math.min(MAX_ROW_SPAN, Math.round((dy + GAP) / (rowHeight + GAP))));

        if (edge === "left" && anchorRightCol !== undefined) {
          const gridEl = gridRef.current;
          if (!gridEl) return;
          const gridRect = gridEl.getBoundingClientRect();
          const contentX = lastMouseX - gridRect.left + gridEl.scrollLeft;
          let newColStart = Math.max(1, Math.min(anchorRightCol - 1, Math.round(contentX / (cw + GAP)) + 1));
          let newCol = Math.max(1, anchorRightCol - newColStart);
          const growth = newCol - span.col;
          if (growth > maxColGrowth) {
            newCol = span.col + maxColGrowth;
            newColStart = anchorRightCol - newCol;
          }
          const next: DragState = { id, cardEl, targetCol: newCol, targetRow: tr, targetColStart: newColStart, targetRowStart: pinnedRowStart };
          dragRef.current = next;
          setDrag(next);
        } else {
          const dx = lastMouseX - cardRect.left;
          let tc = Math.max(1, Math.min(numCols, Math.round((dx + GAP) / (cw + GAP))));
          const growth = tc - span.col;
          if (growth > maxColGrowth) tc = span.col + maxColGrowth;
          const next: DragState = { id, cardEl, targetCol: tc, targetRow: tr };
          dragRef.current = next;
          setDrag(next);
        }
      };

      const startAutoScroll = () => {
        if (scrollTimer || !scrollParent) return;
        scrollTimer = setInterval(() => {
          if (!scrollParent) return;
          const rect = scrollParent.getBoundingClientRect();
          if (rect.bottom - lastMouseY < SCROLL_THRESHOLD) {
            scrollParent.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" });
            updateDrag();
          } else {
            stopAutoScroll();
          }
        }, SCROLL_INTERVAL);
      };
      const stopAutoScroll = () => {
        if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; }
      };

      const onMove = (ev: MouseEvent) => {
        lastMouseX = ev.clientX;
        lastMouseY = ev.clientY;
        updateDrag();

        if (scrollParent) {
          const rect = scrollParent.getBoundingClientRect();
          if (rect.bottom - ev.clientY < SCROLL_THRESHOLD) startAutoScroll();
          else stopAutoScroll();
        }
      };
      const onUp = () => {
        stopAutoScroll();
        const final = dragRef.current!;
        const colDelta = final.targetCol - span.col;

        setSpans((prev) => {
          const next = { ...prev };

          // Pin all card positions when shrinking a neighbor so CSS grid
          // does not reflow anything horizontally
          if (neighbor && colDelta !== 0) {
            for (const [cid, pos] of Object.entries(allPositions)) {
              const ex = next[cid] ?? { col: colMultiplier, row: defaultRowSpan };
              if (!ex.colStart || !ex.rowStart) {
                next[cid] = { ...ex, colStart: pos.colStart, rowStart: pos.rowStart };
              }
            }
          }

          // Update resized card
          const existing = next[id] ?? {};
          const updated: GridSpan = { ...existing, col: final.targetCol, row: final.targetRow };
          if (final.targetColStart !== undefined) updated.colStart = final.targetColStart;
          else if (pinnedColStart !== undefined) updated.colStart = pinnedColStart;
          else if (allPositions[id]) updated.colStart = allPositions[id].colStart;
          if (final.targetRowStart !== undefined) updated.rowStart = final.targetRowStart;
          else if (pinnedRowStart !== undefined) updated.rowStart = pinnedRowStart;
          else if (allPositions[id]) updated.rowStart = allPositions[id].rowStart;
          next[id] = updated;

          // Shrink (or grow) the horizontal neighbor by the inverse delta
          if (neighbor && colDelta !== 0) {
            const nEx = next[neighbor.id] ?? { col: colMultiplier, row: defaultRowSpan };
            const newNeighborCol = Math.max(1, nEx.col - colDelta);
            const nUpdated: GridSpan = { ...nEx, col: newNeighborCol };
            if (edge === "right") {
              // Neighbor is to the right -- shift its start rightward
              nUpdated.colStart = neighbor.colStart + colDelta;
            }
            // Left edge: neighbor keeps its colStart, loses/gains width from its right side
            next[neighbor.id] = nUpdated;
          }

          onSpansChange?.(next);
          return next;
        });
        dragRef.current = null;
        setDrag(null);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [spans, numCols, getCellWidth, rowHeight, defaultRowSpan, colMultiplier, onSpansChange, setSpans, freeform],
  );

  const pinAllPositions = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    const cw = getCellWidth();
    const sl = gridEl.scrollLeft;
    const st = gridEl.scrollTop;
    let hasUnpinned = false;
    for (const [itemId, el] of cardElsRef.current) {
      const existing = spans[itemId];
      if (existing?.colStart && existing?.rowStart) continue;
      hasUnpinned = true;
      // Walk up to the wrapper Box (direct grid child)
      const wrapper = el.closest("[data-grid-item]") as HTMLElement | null;
      if (!wrapper) continue;
      const rect = wrapper.getBoundingClientRect();
      const relX = rect.left - gridRect.left + sl;
      const relY = rect.top - gridRect.top + st;
      const colStart = Math.max(1, Math.round(relX / (cw + GAP)) + 1);
      const rowStart = Math.max(1, Math.round(relY / (rowHeight + GAP)) + 1);
      spans[itemId] = { ...(existing ?? { col: colMultiplier, row: defaultRowSpan }), colStart, rowStart };
    }
    if (hasUnpinned) {
      const pinned = { ...spans };
      setSpans(pinned);
      onSpansChange?.(pinned);
    }
  }, [gridRef, spans, getCellWidth, rowHeight, colMultiplier, defaultRowSpan, cardElsRef, setSpans, onSpansChange]);

  const handleFreeformReorder = useCallback(
    (id: string, cardEl: HTMLElement, e: React.MouseEvent) => {
      e.preventDefault();
      pinAllPositions();
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const gridRect = gridEl.getBoundingClientRect();
      const scrollLeft = gridEl.scrollLeft;
      const scrollTop = gridEl.scrollTop;
      const cw = getCellWidth();
      const cardRect = cardEl.getBoundingClientRect();
      const grabOffsetX = e.clientX - cardRect.left;
      const grabOffsetY = e.clientY - cardRect.top;
      const span = spans[id] ?? { col: colMultiplier, row: defaultRowSpan };

      // Create a floating ghost clone (same pattern as structured mode)
      const ghost = cardEl.cloneNode(true) as HTMLElement;
      ghost.querySelectorAll("canvas, iframe, video").forEach((n) => n.remove());
      ghost.style.cssText = [
        "position:fixed", "pointer-events:none", "z-index:9999",
        `width:${cardRect.width}px`,
        `height:${cardRect.height}px`,
        "overflow:hidden",
        "opacity:0.85",
        "border-radius:8px",
        "box-shadow:0 12px 40px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)",
        "transform:scale(0.97)",
        "cursor:grabbing",
        `left:${e.clientX - grabOffsetX}px`,
        `top:${e.clientY - grabOffsetY}px`,
      ].join(";");
      document.body.appendChild(ghost);

      const cursorStyle = document.createElement("style");
      cursorStyle.textContent = "* { cursor: grabbing !important; }";
      document.head.appendChild(cursorStyle);

      const cellFromMouse = (mx: number, my: number) => {
        const relX = mx - gridRect.left + scrollLeft - grabOffsetX;
        const relY = my - gridRect.top + scrollTop - grabOffsetY;
        const col = Math.max(1, Math.min(numCols - span.col + 1, Math.floor(relX / (cw + GAP)) + 1));
        const row = Math.max(1, Math.floor(relY / (rowHeight + GAP)) + 1);
        return { col, row };
      };

      const { col, row } = cellFromMouse(e.clientX, e.clientY);
      const initial: ReorderDragState = { dragId: id, cardEl, targetColStart: col, targetRowStart: row, grabOffsetX, grabOffsetY };
      reorderDragRef.current = initial;
      setReorderDrag(initial);

      const onMove = (ev: MouseEvent) => {
        ghost.style.left = `${ev.clientX - grabOffsetX}px`;
        ghost.style.top = `${ev.clientY - grabOffsetY}px`;
        const { col: c, row: r } = cellFromMouse(ev.clientX, ev.clientY);
        const next: ReorderDragState = { ...initial, targetColStart: c, targetRowStart: r };
        reorderDragRef.current = next;
        setReorderDrag(next);
      };
      const onUp = () => {
        ghost.remove();
        cursorStyle.remove();
        const final = reorderDragRef.current!;
        setSpans((prev) => {
          const existing = prev[id] ?? { col: colMultiplier, row: defaultRowSpan };
          const next = { ...prev, [id]: { ...existing, colStart: final.targetColStart, rowStart: final.targetRowStart } };
          onSpansChange?.(next);
          return next;
        });
        reorderDragRef.current = null;
        setReorderDrag(null);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [gridRef, spans, numCols, colMultiplier, defaultRowSpan, getCellWidth, rowHeight, onSpansChange, setSpans],
  );

  const handleStructuredReorder = useCallback(
    (id: string, cardEl: HTMLElement, e: React.MouseEvent) => {
      e.preventDefault();
      structuredRef.current = { dragId: id, lastOverId: null };
      setStructuredDragId(id);

      // Clone the card as a floating ghost anchored to the grab point
      const rect = cardEl.getBoundingClientRect();
      const grabX = e.clientX - rect.left;
      const grabY = e.clientY - rect.top;
      const ghost = cardEl.cloneNode(true) as HTMLElement;
      // Strip interactive internals (canvases, iframes) to keep it lightweight
      ghost.querySelectorAll("canvas, iframe, video").forEach((n) => n.remove());
      ghost.style.cssText = [
        "position:fixed", "pointer-events:none", "z-index:9999",
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        "overflow:hidden",
        "opacity:0.85",
        "border-radius:8px",
        "box-shadow:0 12px 40px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)",
        "transform:scale(0.97)",
        "cursor:grabbing",
        `left:${e.clientX - grabX}px`,
        `top:${e.clientY - grabY}px`,
      ].join(";");
      document.body.appendChild(ghost);

      // Force grabbing cursor on everything while dragging
      const cursorStyle = document.createElement("style");
      cursorStyle.textContent = "* { cursor: grabbing !important; }";
      document.head.appendChild(cursorStyle);

      let highlightEl: HTMLElement | null = null;
      const clearHighlight = () => {
        if (highlightEl) {
          highlightEl.style.outline = "";
          highlightEl.style.outlineOffset = "";
          highlightEl = null;
        }
      };

      const hitTest = (mx: number, my: number): string | null => {
        for (const [tid, el] of cardElsRef.current) {
          if (tid === id) continue;
          const r = el.getBoundingClientRect();
          if (mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom) return tid;
        }
        return null;
      };

      let lastHighlightId: string | null = null;
      const onMove = (ev: MouseEvent) => {
        ghost.style.left = `${ev.clientX - grabX}px`;
        ghost.style.top = `${ev.clientY - grabY}px`;

        const targetId = hitTest(ev.clientX, ev.clientY);
        if (targetId !== lastHighlightId) {
          clearHighlight();
          lastHighlightId = targetId;
          if (targetId) {
            const el = cardElsRef.current.get(targetId) ?? null;
            if (el) {
              el.style.outline = "2px dashed rgba(25, 118, 210, 0.8)";
              el.style.outlineOffset = "2px";
              highlightEl = el;
            }
          }
        }
      };
      const onUp = (ev: MouseEvent) => {
        ghost.remove();
        cursorStyle.remove();
        clearHighlight();
        // Fresh hit test at drop point for reliability
        const dropTargetId = hitTest(ev.clientX, ev.clientY);
        const currentItems = itemsRef.current;
        const fromIdx = dropTargetId ? currentItems.findIndex((t) => t.id === id) : -1;
        const toIdx = dropTargetId ? currentItems.findIndex((t) => t.id === dropTargetId) : -1;
        console.log("[grid-drag] onUp", {
          dragId: id, dropTargetId,
          fromIdx, toIdx,
          itemCount: currentItems.length,
          itemIds: currentItems.map((t) => t.id),
          cardElsCount: cardElsRef.current.size,
          hasReorderFn: !!onReorderRef.current,
          cursor: { x: ev.clientX, y: ev.clientY },
        });
        if (dropTargetId && fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          onReorderRef.current?.(fromIdx, toIdx);
        }
        structuredRef.current = null;
        setStructuredDragId(null);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [],
  );

  const handleReorderStart = useCallback(
    (id: string, cardEl: HTMLElement, e: React.MouseEvent) => {
      if (freeform) handleFreeformReorder(id, cardEl, e);
      else handleStructuredReorder(id, cardEl, e);
    },
    [freeform, handleFreeformReorder, handleStructuredReorder],
  );

  const isDragging = (id: string) => {
    if (freeform) return reorderDrag?.dragId === id;
    return structuredDragId === id;
  };

  return { drag, reorderDrag, handleResizeStart, handleReorderStart, isDragging, cardElsRef };
}
