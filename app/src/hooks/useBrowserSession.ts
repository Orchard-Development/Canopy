import { useEffect, useRef, useState, useCallback } from "react";
import type { Channel } from "phoenix";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pendingFrameRef = useRef<string | null>(null);
  const refsToClean = useRef<Array<{ event: string; ref: number }>>([]);
  // Track the native resolution of the screencast for coordinate mapping
  const nativeSizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 500 });

  // Draw a base64 JPEG frame onto the canvas
  const drawFrame = useCallback((base64Data: string) => {
    pendingFrameRef.current = base64Data;

    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const data = pendingFrameRef.current;
      if (!data || !canvasRef.current) return;
      pendingFrameRef.current = null;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
          nativeSizeRef.current = { w: img.width, h: img.height };
        }
        ctx.drawImage(img, 0, 0);
      };
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      img.src = url;
      // Clean up blob URL after load
      img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    });
  }, []);

  // Map a CSS-pixel click position on the canvas to native CDP coordinates
  const mapCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = nativeSizeRef.current.w / rect.width;
      const scaleY = nativeSizeRef.current.h / rect.height;
      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY),
      };
    },
    [],
  );

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
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [sessionId, channel, drawFrame]);

  return {
    url: state.url,
    title: state.title,
    isLive: state.isLive,
    canvasRef,
    handleClick,
    handleKeyDown,
  };
}
