import { useEffect, useRef } from "react";
import type { Channel } from "phoenix";
import { useLocation } from "react-router-dom";

/**
 * Tracks in-app user interactions and pushes them to the engine
 * via the dashboard channel. Captures:
 *
 * - window_focus / window_blur (Orchard app focus)
 * - typing_start / typing_stop (debounced, any input)
 * - terminal_focus / terminal_blur (terminal drawer interaction)
 * - view_navigate (route changes)
 * - clipboard_paste (paste events, content omitted)
 * - scroll_active (debounced scroll activity)
 *
 * All events are fire-and-forget pushes -- no ack needed.
 */
export function useUserActivity(channel: Channel | null): void {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push helper -- fire and forget
  const push = useRef((type: string, data: Record<string, unknown> = {}) => {
    if (!channel) return;
    channel.push("user:activity", {
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  });

  // Keep push ref current
  useEffect(() => {
    push.current = (type: string, data: Record<string, unknown> = {}) => {
      if (!channel) return;
      channel.push("user:activity", {
        type,
        data,
        timestamp: new Date().toISOString(),
      });
    };
  }, [channel]);

  // -- Window focus/blur --
  useEffect(() => {
    const onFocus = () => push.current("window_focus");
    const onBlur = () => push.current("window_blur");
    const onVisChange = () => {
      push.current(document.hidden ? "window_blur" : "window_focus");
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);

  // -- Typing start/stop (debounced 2s idle = stop) --
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Only track actual typing in inputs/textareas, not shortcuts
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (!isTyping.current) {
        isTyping.current = true;
        push.current("typing_start", { element: tag.toLowerCase() });
      }

      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        isTyping.current = false;
        push.current("typing_stop", { element: tag.toLowerCase() });
      }, 2000);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // -- Clipboard paste --
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const types = e.clipboardData?.types || [];
      const hasText = types.includes("text/plain");
      const hasFiles = types.includes("Files");
      push.current("clipboard_paste", {
        has_text: hasText,
        has_files: hasFiles,
        target: (e.target as HTMLElement)?.tagName?.toLowerCase() || "unknown",
      });
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // -- View navigation --
  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      push.current("view_navigate", {
        from: prevPath.current,
        to: location.pathname,
      });
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  // -- Scroll activity (debounced, fires once per burst) --
  useEffect(() => {
    const onScroll = () => {
      if (scrollTimer.current) return;
      push.current("scroll_active", { path: location.pathname });
      scrollTimer.current = setTimeout(() => {
        scrollTimer.current = null;
      }, 5000);
    };

    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [location.pathname]);

  // -- Mouse click tracking (captures interaction targets) --
  useEffect(() => {
    let lastClick = 0;
    const onClick = (e: MouseEvent) => {
      // Throttle to 1 per second
      const now = Date.now();
      if (now - lastClick < 1000) return;
      lastClick = now;

      const el = e.target as HTMLElement;
      const tag = el.tagName?.toLowerCase() || "unknown";
      const role = el.getAttribute("role") || "";
      const ariaLabel = el.getAttribute("aria-label") || "";
      const text = el.textContent?.slice(0, 30) || "";

      push.current("click", {
        tag,
        role,
        aria_label: ariaLabel,
        text: text.trim(),
        path: location.pathname,
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [location.pathname]);
}
