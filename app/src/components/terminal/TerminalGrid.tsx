import { useNavigate } from "react-router-dom";
import { TerminalCard } from "./TerminalCard";
import { ResizableGrid, type GridSpan } from "../ResizableGrid";
import type { GridColumns } from "./TerminalGridToolbar";
import type { TerminalTab } from "./TerminalDrawerContent";
import type { SessionProfile } from "./ProfileTooltip";

interface Props {
  tabs: TerminalTab[];
  profiles?: Record<string, SessionProfile>;
  columns: GridColumns;
  freeform?: boolean;
  initialSpans?: Record<string, GridSpan>;
  onSpansChange?: (spans: Record<string, GridSpan>) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onCardFocus?: (id: string) => void;
  onKill: (id: string) => void;
  onExit: (id: string, code: number) => void;
  scrollToId?: string | null;
  onViewLog?: (sessionId: string) => void;
  onOpenLogFile?: (sessionId: string) => void;
  onAiSync?: (id: string, updates: { label?: string; summary?: string; lastAiUpdate?: number }) => void;
  externalRefreshKey?: number;
}

export function TerminalGrid({ tabs, profiles, columns, freeform, initialSpans, onSpansChange, onReorder, onCardFocus, onKill, onExit, scrollToId, onViewLog, onOpenLogFile, onAiSync, externalRefreshKey }: Props) {
  const navigate = useNavigate();

  return (
    <ResizableGrid
      items={tabs}
      columns={columns}
      freeform={freeform}
      rowHeight={75}
      defaultRowSpan={4}
      colMultiplier={4}
      minCellWidth={400}
      initialSpans={initialSpans}
      onSpansChange={onSpansChange}
      onReorder={onReorder}
      onItemFocus={onCardFocus}
      scrollToId={scrollToId}
      renderCard={(tab, { colSpan, rowSpan, isDragging, onResizeStart, onReorderStart, cardRef }) => (
        <TerminalCard
          key={tab.id}
          ref={(el: HTMLElement | null) => cardRef(el)}
          tab={tab}
          profile={profiles?.[tab.id]}
          colSpan={colSpan}
          rowSpan={rowSpan}
          isDragging={isDragging}
          onResizeStart={onResizeStart}
          onReorderStart={onReorderStart}
          onExpand={() => { onCardFocus?.(tab.id); navigate(`/terminals/${tab.id}`); }}
          onKill={() => onKill(tab.id)}
          onExit={(code) => onExit(tab.id, code)}
          onViewLog={onViewLog ? () => onViewLog(tab.id) : undefined}
          onOpenLogFile={onOpenLogFile ? () => onOpenLogFile(tab.id) : undefined}
          onAiSync={onAiSync}
          externalRefreshKey={externalRefreshKey}
        />
      )}
    />
  );
}
