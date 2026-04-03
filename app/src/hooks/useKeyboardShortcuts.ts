import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onQuickOpen?: () => void;
  onCloseTab?: () => void;
  onToggleSearch?: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "p") {
        e.preventDefault();
        handlersRef.current.onQuickOpen?.();
      } else if (e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        handlersRef.current.onCloseTab?.();
      } else if (e.shiftKey && e.key === "F") {
        e.preventDefault();
        handlersRef.current.onToggleSearch?.();
      } else if (e.key === "\\") {
        e.preventDefault();
        handlersRef.current.onToggleSidebar?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
