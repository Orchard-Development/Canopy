import { useEffect, useRef, useState, useCallback } from "react";
import type { Channel } from "phoenix";
import { useFrameCanvas } from "./useFrameCanvas";

interface DesktopSessionState {
  title: string;
  isLive: boolean;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Electron preload exposes window.orchard.viewer in the desktop shell
interface OrchardViewer {
  startMirror: (opts: {
    sessionId: string;
    target: { title?: string; pid?: number; app?: string };
    fps?: number;
  }) => Promise<{
    ok: boolean;
    title?: string;
    error?: string;
    sourceId?: string;
    cropRegion?: CropRegion;
    displayBounds?: CropRegion;
  }>;
  stopMirror: (sessionId: string) => Promise<{ ok: boolean }>;
  onFrame: (
    cb: (event: unknown, data: { session_id: string; data: string }) => void,
  ) => void;
  offFrame: (cb: (...args: unknown[]) => void) => void;
  onRegionUpdate: (
    cb: (event: unknown, region: CropRegion) => void,
  ) => void;
  offRegionUpdate: (cb: (...args: unknown[]) => void) => void;
  relayClick: (event: {
    localX: number;
    localY: number;
    button: "left" | "right" | "middle";
    type: "click" | "double_click";
  }) => Promise<unknown>;
  relayScroll: (event: {
    localX: number;
    localY: number;
    deltaX: number;
    deltaY: number;
  }) => Promise<unknown>;
  relayType: (event: { text: string }) => Promise<unknown>;
  relayKey: (event: { key: string; modifiers?: string[] }) => Promise<unknown>;
}

function getViewer(): OrchardViewer | null {
  const w = window as Record<string, unknown>;
  const orchard = w.orchard as { viewer?: Record<string, unknown> } | undefined;
  const viewer = orchard?.viewer;
  if (viewer && typeof viewer.startMirror === "function") {
    return viewer as unknown as OrchardViewer;
  }
  return null;
}

interface WindowTarget {
  title?: string;
  app?: string;
  pid?: number;
  bundleId?: string;
}

// With getUserMedia we get a real MediaStream -- 30fps is smooth
// without the overhead of encoding/decoding each frame.
const DEFAULT_FPS = 30;
const DEFAULT_MAX_WIDTH = 1920;

/**
 * Subscribe to desktop mirror frames and provide interactive input.
 *
 * In Electron: opens a persistent getUserMedia stream and renders
 * frames directly via canvas drawImage (no IPC per frame).
 * In web: frames come via Phoenix channel, input sends via channel.
 */
export function useDesktopSession(
  sessionId: string | null,
  channel: Channel | null,
  initialTitle?: string,
  windowTarget?: WindowTarget,
) {
  const [state, setState] = useState<DesktopSessionState>({
    title: initialTitle || "Desktop Window",
    isLive: true,
  });

  const { canvasRef, drawFrame, mapCoords, cleanup } = useFrameCanvas();
  const refsToClean = useRef<Array<{ event: string; ref: number }>>([]);
  const viewerRef = useRef(getViewer());
  const windowTargetRef = useRef(windowTarget);

  // -- Input handlers: direct IPC when in Electron, channel fallback --

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!sessionId || !state.isLive) return;
      const coords = mapCoords(e.clientX, e.clientY);
      if (!coords) return;

      if (viewerRef.current) {
        viewerRef.current.relayClick({
          localX: coords.x,
          localY: coords.y,
          button: "left",
          type: "click",
        });
      } else if (channel) {
        channel.push("desktop:click", {
          session_id: sessionId,
          x: coords.x,
          y: coords.y,
        });
      }
    },
    [channel, sessionId, state.isLive, mapCoords],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!sessionId || !state.isLive) return;
      e.preventDefault();

      const specialKeys = new Set([
        "Enter", "Tab", "Escape", "Backspace", "Delete",
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Home", "End", "PageUp", "PageDown",
      ]);

      if (viewerRef.current) {
        if (specialKeys.has(e.key)) {
          viewerRef.current.relayKey({ key: e.key, modifiers: getModifiers(e) });
        } else if (e.key.length === 1) {
          viewerRef.current.relayType({ text: e.key });
        }
      } else if (channel) {
        if (specialKeys.has(e.key)) {
          channel.push("desktop:key", {
            session_id: sessionId,
            key: e.key,
            modifiers: getModifiers(e),
          });
        } else if (e.key.length === 1) {
          channel.push("desktop:type", {
            session_id: sessionId,
            text: e.key,
          });
        }
      }
    },
    [channel, sessionId, state.isLive],
  );

  const handleScroll = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!sessionId || !state.isLive) return;
      e.preventDefault();
      const coords = mapCoords(e.clientX, e.clientY);
      if (!coords) return;

      if (viewerRef.current) {
        viewerRef.current.relayScroll({
          localX: coords.x,
          localY: coords.y,
          deltaX: Math.round(e.deltaX),
          deltaY: Math.round(e.deltaY),
        });
      } else if (channel) {
        channel.push("desktop:scroll", {
          session_id: sessionId,
          x: coords.x,
          y: coords.y,
          deltaX: Math.round(e.deltaX),
          deltaY: Math.round(e.deltaY),
        });
      }
    },
    [channel, sessionId, state.isLive, mapCoords],
  );

  // -- Electron path: persistent getUserMedia stream --
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!sessionId || !viewer) return;

    let stopped = false;
    let stream: MediaStream | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let rafId: number | null = null;

    const wt = windowTargetRef.current;
    const mirrorTarget = wt && Object.keys(wt).length > 0
      ? wt
      : { title: initialTitle };

    // Mutable crop state updated by region change events
    let cropRegion: CropRegion | null = null;
    let displayBounds: CropRegion | null = null;
    // Window sources (id contains "window:") already scope the stream
    // to the target window -- no cropping needed.
    let isWindowSource = false;

    const regionHandler = (
      _event: unknown,
      region: CropRegion,
    ) => {
      cropRegion = region;
    };

    async function startStream(sourceId: string) {
      // Open persistent screen capture stream via Chromium media pipeline.
      // chromeMediaSource/chromeMediaSourceId are Chromium-specific constraints.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        } as MediaTrackConstraints,
      });

      videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.muted = true;
      // Required for autoplay without user gesture in Electron
      videoEl.setAttribute("playsinline", "");
      await videoEl.play();

      // Start the render loop once video is producing frames
      renderLoop();
    }

    // Use requestAnimationFrame for smooth, vsync-aligned rendering.
    // Throttle to DEFAULT_FPS to avoid wasting GPU cycles.
    let lastFrameTime = 0;
    const frameDuration = 1000 / DEFAULT_FPS;

    function renderLoop() {
      if (stopped) return;
      rafId = requestAnimationFrame((time) => {
        if (stopped) return;

        // Throttle: skip if not enough time has elapsed
        if (time - lastFrameTime < frameDuration) {
          renderLoop();
          return;
        }
        lastFrameTime = time;

        pullFrame();
        renderLoop();
      });
    }

    function pullFrame() {
      if (stopped || !videoEl) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      if (vw === 0 || vh === 0) return;

      // For window sources, the stream IS the window content --
      // draw the full frame directly. For screen sources with a
      // crop region, extract the relevant portion.
      if (isWindowSource || !cropRegion || !displayBounds) {
        // Direct draw: full video frame to canvas.
        // Cap output width for performance.
        let outW = vw;
        let outH = vh;
        if (outW > DEFAULT_MAX_WIDTH) {
          const ratio = DEFAULT_MAX_WIDTH / outW;
          outW = DEFAULT_MAX_WIDTH;
          outH = Math.round(outH * ratio);
        }

        if (canvas.width !== outW || canvas.height !== outH) {
          canvas.width = outW;
          canvas.height = outH;
        }

        ctx.drawImage(videoEl, 0, 0, outW, outH);
      } else {
        // Screen source with crop: map logical region to video pixels.
        const scaleX = vw / displayBounds.width;
        const scaleY = vh / displayBounds.height;

        const sx = Math.max(0, (cropRegion.x - displayBounds.x) * scaleX);
        const sy = Math.max(0, (cropRegion.y - displayBounds.y) * scaleY);
        const sw = Math.min(vw - sx, cropRegion.width * scaleX);
        const sh = Math.min(vh - sy, cropRegion.height * scaleY);

        let outW = Math.round(cropRegion.width * scaleX);
        let outH = Math.round(cropRegion.height * scaleY);
        if (outW > DEFAULT_MAX_WIDTH) {
          const ratio = DEFAULT_MAX_WIDTH / outW;
          outW = DEFAULT_MAX_WIDTH;
          outH = Math.round(outH * ratio);
        }

        if (canvas.width !== outW || canvas.height !== outH) {
          canvas.width = outW;
          canvas.height = outH;
        }

        ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, outW, outH);
      }
    }

    // Kick off the mirror
    viewer
      .startMirror({ sessionId, target: mirrorTarget, fps: DEFAULT_FPS })
      .then(async (result) => {
        if (stopped) return;
        if (!result.ok) {
          if (result.error?.includes("superseded")) return;
          console.error("[desktop-mirror] start failed:", result.error);
          setState((s) => ({ ...s, isLive: false }));
          return;
        }

        if (result.title) {
          setState((s) => ({ ...s, title: result.title || s.title }));
        }

        // If main process returned a sourceId, use the stream path
        if (result.sourceId) {
          isWindowSource = result.sourceId.includes("window:");
          cropRegion = result.cropRegion || null;
          displayBounds = result.displayBounds || null;
          viewer.onRegionUpdate(regionHandler);

          try {
            await startStream(result.sourceId);
          } catch (err) {
            console.error("[desktop-mirror] getUserMedia failed:", err);
            // Fall back to IPC frame path
            fallbackToIpcFrames();
          }
        } else {
          // Old main process without sourceId -- use legacy IPC frame path
          fallbackToIpcFrames();
        }
      });

    // Legacy fallback: subscribe to viewer:frame IPC events
    let ipcFrameHandler: ((event: unknown, data: { session_id: string; data: string }) => void) | null = null;

    function fallbackToIpcFrames() {
      ipcFrameHandler = (
        _event: unknown,
        data: { session_id: string; data: string },
      ) => {
        if (data.session_id === sessionId) {
          drawFrame(data.data);
        }
      };
      viewer.onFrame(ipcFrameHandler);
    }

    return () => {
      stopped = true;

      // Clean up stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
        videoEl = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Clean up IPC listeners
      viewer.offRegionUpdate(regionHandler);
      if (ipcFrameHandler) {
        viewer.offFrame(ipcFrameHandler);
      }

      viewer.stopMirror(sessionId);
      cleanup();
    };
  }, [sessionId, initialTitle, drawFrame, cleanup]);

  // -- Channel path: frames via Phoenix channel (web/remote) --
  useEffect(() => {
    if (!sessionId || !channel || viewerRef.current) return;

    channel.push("desktop:open", { session_id: sessionId });

    const frameRef = channel.on(
      "desktop:frame",
      (p: { session_id: string; data: string }) => {
        if (p.session_id === sessionId) {
          drawFrame(p.data);
        }
      },
    );

    const openRef = channel.on(
      "desktop:opened",
      (p: { session_id: string; window_title: string }) => {
        if (p.session_id === sessionId) {
          setState((s) => ({ ...s, title: p.window_title || s.title }));
        }
      },
    );

    const closeRef = channel.on(
      "desktop:closed",
      (p: { session_id: string }) => {
        if (p.session_id === sessionId) {
          setState((s) => ({ ...s, isLive: false }));
        }
      },
    );

    refsToClean.current = [
      { event: "desktop:frame", ref: frameRef },
      { event: "desktop:opened", ref: openRef },
      { event: "desktop:closed", ref: closeRef },
    ];

    return () => {
      for (const { event, ref } of refsToClean.current) {
        channel.off(event, ref);
      }
      refsToClean.current = [];
      cleanup();
    };
  }, [sessionId, channel, drawFrame, cleanup]);

  // -- Both paths: listen for engine close event via channel --
  useEffect(() => {
    if (!sessionId || !channel) return;

    const closeRef = channel.on(
      "desktop:closed",
      (p: { session_id: string }) => {
        if (p.session_id === sessionId) {
          setState((s) => ({ ...s, isLive: false }));
        }
      },
    );

    // Auto-close when the chat worker finishes or errors out
    const doneRef = channel.on("done", () => {
      setState((s) => ({ ...s, isLive: false }));
      const viewer = viewerRef.current;
      if (viewer) {
        viewer.stopMirror(sessionId);
      }
    });

    const errorRef = channel.on("error", () => {
      setState((s) => ({ ...s, isLive: false }));
      const viewer = viewerRef.current;
      if (viewer) {
        viewer.stopMirror(sessionId);
      }
    });

    return () => {
      channel.off("desktop:closed", closeRef);
      channel.off("done", doneRef);
      channel.off("error", errorRef);
    };
  }, [sessionId, channel]);

  return {
    title: state.title,
    isLive: state.isLive,
    canvasRef,
    handleClick,
    handleKeyDown,
    handleScroll,
  };
}

function getModifiers(e: React.KeyboardEvent): string[] {
  const mods: string[] = [];
  if (e.metaKey) mods.push("Meta");
  if (e.ctrlKey) mods.push("Control");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  return mods;
}
