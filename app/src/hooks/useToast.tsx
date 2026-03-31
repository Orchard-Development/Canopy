import { createContext, useContext, useCallback, useState, useEffect, useMemo, type ReactNode, createElement } from "react";
import { useEvents, type EngineEvent, type EventSeverity, type EventActionMeta } from "./useEventBus";
import { useSettingsContext } from "../contexts/SettingsContext";
import { useToastThrottle } from "./useToastThrottle";

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
 * 1. Automatically from EventBus events (throttled + batched via useToastThrottle)
 * 2. Manually via toast.show() for non-event toasts (e.g. local UI feedback)
 */
export function useToastProvider(): { api: ToastApi; visible: ToastEntry[] } {
  const [manualEntries, setManualEntries] = useState<ToastEntry[]>([]);
  const { events } = useEvents();
  const { settings } = useSettingsContext();

  // Build the filtered event list to pass to throttle hook
  const filteredEvents = useMemo(() => {
    const toastCategories = buildToastSet(settings);
    return events.filter((e) => isToastWorthy(e, toastCategories));
  }, [events, settings]);

  // Get throttled/batched entries from the hook
  const throttledEntries = useToastThrottle(filteredEvents);

  // Attach action nodes to throttled entries that need them (single-event pass-throughs)
  const throttledWithActions = useMemo(() => {
    return throttledEntries.map((entry) => {
      // Find if there's a corresponding single event with actionMeta
      const match = events.find(
        (e) => e.message === entry.message && e.actionMeta,
      );
      if (match?.actionMeta) {
        return { ...entry, action: actionMetaToButton(match.actionMeta) };
      }
      return entry;
    });
  }, [throttledEntries, events]);

  // Merge manual + throttled entries; keep most recent MAX_VISIBLE
  const visible = useMemo(() => {
    const all = [...manualEntries, ...throttledWithActions];
    return all.slice(-MAX_VISIBLE);
  }, [manualEntries, throttledWithActions]);

  // Manual toast API (bypasses throttle — user-initiated)
  const show = useCallback((opts: { message: string; severity?: ToastSeverity; duration?: number | null; action?: ReactNode }) => {
    const entry: ToastEntry = {
      id: nextId++,
      message: opts.message,
      severity: opts.severity ?? "info",
      duration: opts.duration === undefined ? 4000 : opts.duration ?? 0,
      action: opts.action,
    };
    setManualEntries((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), entry]);
  }, []);

  const dismiss = useCallback((id?: number) => {
    setManualEntries((prev) => {
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

export const DEFAULT_TOAST_CATEGORIES = new Set([
  "engine", "session", "prompt", "subagent", "proposal", "autocommit", "autopush", "task",
]);

const ALL_CATEGORIES = [
  "engine", "session", "prompt", "subagent", "proposal", "autocommit", "autopush",
  "tool", "context", "permission", "notification", "project", "analysis", "autopull", "task",
];

function buildToastSet(settings: Record<string, string>): Set<string> {
  const set = new Set<string>();
  for (const cat of ALL_CATEGORIES) {
    const val = settings[`notifications.toast.${cat}`];
    if (val === undefined ? DEFAULT_TOAST_CATEGORIES.has(cat) : val === "true") {
      set.add(cat);
    }
  }
  return set;
}

function isToastWorthy(event: EngineEvent, categories: Set<string>): boolean {
  // Errors always toast regardless of category
  if (event.severity === "error") return true;
  return categories.has(event.category);
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
