import { useEffect, useRef, useState, useCallback } from "react";
import type { Channel } from "phoenix";
import { useFrameCanvas } from "./useFrameCanvas";

interface BrowserSessionState {
  url: string;
  title: string;
  isLive: boolean;
}

/**
 * Subscribe to browser screencast frames from the ChatChannel.
 *
 * Listens for browser:frame, browser:navigated, and browser:closed
 * events on the given channel. Draws JPEG frames onto the provided
 * canvas ref. Sends user clicks and keyboard input back through
 * the channel for interactive browsing.
 */
export function useBrowserSession(
  sessionId: string | null,
  channel: Channel | null,
) {
  const [state, setState] = useState<BrowserSessionState>({
    url: "",
    title: "",
    isLive: true,
  });
  const { canvasRef, drawFrame, mapCoords, cleanup } = useFrameCanvas();
  const refsToClean = useRef<Array<{ event: string; ref: number }>>([]);

  // Send a click to the browser at canvas coordinates
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!channel || !sessionId || !state.isLive) return;
      const coords = mapCoords(e.clientX, e.clientY);
      if (!coords) return;
      channel.push("browser:click", {
        session_id: sessionId,
        x: coords.x,
        y: coords.y,
      });
    },
    [channel, sessionId, state.isLive, mapCoords],
  );

  // Send keyboard input to the browser
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!channel || !sessionId || !state.isLive) return;
      e.preventDefault();

      // Special keys
      const specialKeys = new Set([
        "Enter", "Tab", "Escape", "Backspace", "Delete",
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Home", "End", "PageUp", "PageDown",
      ]);

      if (specialKeys.has(e.key)) {
        channel.push("browser:keypress", {
          session_id: sessionId,
          key: e.key,
        });
      } else if (e.key.length === 1) {
        // Printable character
        channel.push("browser:type", {
          session_id: sessionId,
          text: e.key,
        });
      }
    },
    [channel, sessionId, state.isLive],
  );

  useEffect(() => {
    if (!sessionId || !channel) return;

    const frameRef = channel.on(
      "browser:frame",
      (p: { session_id: string; data: string }) => {
        if (p.session_id === sessionId) {
          drawFrame(p.data);
        }
      },
    );

    const navRef = channel.on(
      "browser:navigated",
      (p: { session_id: string; url: string; title: string }) => {
        if (p.session_id === sessionId) {
          setState((s) => ({ ...s, url: p.url, title: p.title || s.title }));
        }
      },
    );

    const closeRef = channel.on(
      "browser:closed",
      (p: { session_id: string }) => {
        if (p.session_id === sessionId) {
          setState((s) => ({ ...s, isLive: false }));
        }
      },
    );

    refsToClean.current = [
      { event: "browser:frame", ref: frameRef },
      { event: "browser:navigated", ref: navRef },
      { event: "browser:closed", ref: closeRef },
    ];

    return () => {
      for (const { event, ref } of refsToClean.current) {
        channel.off(event, ref);
      }
      refsToClean.current = [];
      cleanup();
    };
  }, [sessionId, channel, drawFrame, cleanup]);

  return {
    url: state.url,
    title: state.title,
    isLive: state.isLive,
    canvasRef,
    handleClick,
    handleKeyDown,
  };
}
