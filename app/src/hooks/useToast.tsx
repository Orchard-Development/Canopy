import { createContext, useContext, useCallback, useState, useEffect, type ReactNode, createElement } from "react";
import { useEvents, type EngineEvent, type EventSeverity, type EventActionMeta } from "./useEventBus";

export type ToastSeverity = EventSeverity;

export type { EventActionMeta as NotificationActionMeta } from "./useEventBus";

export interface ToastEntry {
  id: number;
  message: string;
  severity: ToastSeverity;
  duration: number;
  action?: ReactNode;
}

export interface ToastApi {
  show: (opts: { message: string; severity?: ToastSeverity; duration?: number | null; action?: ReactNode }) => void;
  success: (message: string, action?: ReactNode) => void;
  error: (message: string, action?: ReactNode) => void;
  warning: (message: string, action?: ReactNode) => void;
  info: (message: string, action?: ReactNode) => void;
  dismiss: (id?: number) => void;
}

const MAX_VISIBLE = 5;

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider = ToastContext.Provider;

let nextId = 1;

/**
 * Provides the toast popup system. Toasts can be triggered in two ways:
 * 1. Automatically from EventBus events (all engine events show as toasts)
 * 2. Manually via toast.show() for non-event toasts (e.g. local UI feedback)
 */
export function useToastProvider(): { api: ToastApi; visible: ToastEntry[] } {
  const [visible, setVisible] = useState<ToastEntry[]>([]);
  const { events } = useEvents();

  // React to new events from the bus
  const lastSeenRef = useCallback(() => { /* ref holder */ }, []);
  const [lastSeenId, setLastSeenId] = useState(0);

  useEffect(() => {
    const newEvents = events.filter((e) => e.id > lastSeenId);
    if (newEvents.length === 0) return;
    setLastSeenId(newEvents[newEvents.length - 1].id);

    for (const event of newEvents) {
      if (!isToastWorthy(event)) continue;
      const entry: ToastEntry = {
        id: nextId++,
        message: event.message,
        severity: event.severity,
        duration: toastDuration(event),
        action: event.actionMeta ? actionMetaToButton(event.actionMeta) : undefined,
      };
      setVisible((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), entry]);
    }
  }, [events, lastSeenId]);

  // Manual toast API (for non-event toasts)
  const show = useCallback((opts: { message: string; severity?: ToastSeverity; duration?: number | null; action?: ReactNode }) => {
    const entry: ToastEntry = {
      id: nextId++,
      message: opts.message,
      severity: opts.severity ?? "info",
      duration: opts.duration === undefined ? 4000 : opts.duration ?? 0,
      action: opts.action,
    };
    setVisible((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), entry]);
  }, []);

  const dismiss = useCallback((id?: number) => {
    setVisible((prev) => {
      if (id !== undefined) return prev.filter((t) => t.id !== id);
      return prev.slice(1);
    });
  }, []);

  const success = useCallback((msg: string, action?: ReactNode) => show({ message: msg, severity: "success", action }), [show]);
  const error = useCallback((msg: string, action?: ReactNode) => show({ message: msg, severity: "error", action }), [show]);
  const warning = useCallback((msg: string, action?: ReactNode) => show({ message: msg, severity: "warning", action }), [show]);
  const info = useCallback((msg: string, action?: ReactNode) => show({ message: msg, severity: "info", action }), [show]);

  const api: ToastApi = { show, success, error, warning, info, dismiss };
  return { api, visible };
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/** Only these categories produce toasts. Everything else is bell-only. */
const TOAST_CATEGORIES = new Set([
  "engine",     // toast:show from engine
  "session",    // session lifecycle (start/end/exit)
  "prompt",     // user prompt submitted
  "subagent",   // subagent start/stop
  "task",       // task completed
  "proposal",   // proposal created
  "autocommit", // commit results
  "autopush",   // push results
]);

function isToastWorthy(event: EngineEvent): boolean {
  // Errors always toast regardless of category
  if (event.severity === "error") return true;
  return TOAST_CATEGORIES.has(event.category);
}

/** Convert actionMeta into a clickable CTA button for the toast. */
function actionMetaToButton(meta: EventActionMeta): ReactNode {
  const label = meta.type === "focus-session" ? "Focus" : "View";
  const handleClick = () => {
    if (meta.type === "focus-session") {
      window.dispatchEvent(new CustomEvent("ctx:open-terminal", { detail: { sessionId: meta.sessionId, label: meta.label } }));
    } else if (meta.type === "view-proposal") {
      window.dispatchEvent(new CustomEvent("ctx:navigate", { detail: { path: `/proposals/${meta.slug}` } }));
    }
  };
  return createElement(
    "button",
    {
      onClick: handleClick,
      style: {
        background: "none",
        border: "none",
        color: "inherit",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        padding: "4px 8px",
        textTransform: "uppercase" as const,
      },
    },
    label,
  );
}

/** Determine toast duration based on event severity/category. */
function toastDuration(event: EngineEvent): number {
  if (event.severity === "error") return 6000;
  if (event.category === "proposal") return 0; // sticky
  return 3000;
}
