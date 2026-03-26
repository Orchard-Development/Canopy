import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Typography, CircularProgress, LinearProgress, Alert, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

interface Props {
  sessionId: string;
  onDisconnect: () => void;
}

export function RdpCanvas({ sessionId, onDisconnect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef(new Image());
  const hasFrameRef = useRef(false);
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;
  const [hasFrame, setHasFrame] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Connecting...");
  const [connectEpoch, setConnectEpoch] = useState(0);

  const reconnect = useCallback(() => {
    // Close existing connection, bump epoch to trigger effect re-run
    wsRef.current?.close();
    wsRef.current = null;
    hasFrameRef.current = false;
    setHasFrame(false);
    setStatusMsg("Reconnecting...");
    setConnectEpoch((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/rdp/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[rdp] ws connected");
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "frame") {
            if (!hasFrameRef.current) {
              hasFrameRef.current = true;
              setHasFrame(true);
            }
            drawFrame(msg.data, msg.w, msg.h);
          } else if (msg.type === "status") {
            setStatusMsg(msg.message || msg.phase);
            if (msg.phase === "disconnected") onDisconnectRef.current();
          } else if (msg.type === "error") {
            console.error("[rdp]", msg.message);
            setStatusMsg(msg.message);
            if (msg.message?.includes("not found") || msg.message?.includes("not running")) {
              onDisconnectRef.current();
            }
          }
        } catch { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!cancelled) {
          setStatusMsg("Reconnecting...");
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => { setStatusMsg("WebSocket error"); };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        // Remove onclose before closing to prevent async clobbering
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, connectEpoch]);

  function drawFrame(b64: string, w: number, h: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const img = imgRef.current;
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${b64}`;
  }

  function send(msg: Record<string, unknown>) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function canvasCoords(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }

  function handleMouseMove(e: React.MouseEvent) {
    const { x, y } = canvasCoords(e);
    if (e.buttons === 1) {
      send({ type: "mouse", x, y, button: "left", pressed: true });
    } else {
      send({ type: "mouse", x, y, button: "move" });
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    const { x, y } = canvasCoords(e);
    const button = e.button === 0 ? "left" : e.button === 1 ? "middle" : "right";
    send({ type: "mouse", x, y, button, pressed: true });
  }

  function handleMouseUp(e: React.MouseEvent) {
    const { x, y } = canvasCoords(e);
    const button = e.button === 0 ? "left" : e.button === 1 ? "middle" : "right";
    send({ type: "mouse", x, y, button, pressed: false });
  }

  // Attach wheel handler as non-passive native listener so preventDefault works.
  // React's onWheel is passive by default and cannot prevent page scroll.
  // Throttled to prevent flooding the WebSocket with scroll events.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastWheelTime = 0;
    const WHEEL_THROTTLE_MS = 50;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime < WHEEL_THROTTLE_MS) return;
      lastWheelTime = now;

      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      const scaleY = canvas!.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      const button = e.deltaY < 0 ? "wheel_up" : "wheel_down";
      send({ type: "mouse", x, y, button, pressed: true });
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Let paste through to the paste handler instead of sending Ctrl+V scancodes
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyV") {
        return;
      }
      e.preventDefault();
      const sc = domKeyToScancode(e);
      if (sc !== null) send({ type: "key", scancode: sc.code, pressed: true, extended: sc.extended });
    }
    function handleKeyUp(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyV") {
        return;
      }
      e.preventDefault();
      const sc = domKeyToScancode(e);
      if (sc !== null) send({ type: "key", scancode: sc.code, pressed: false, extended: sc.extended });
    }
    function handlePaste(e: ClipboardEvent) {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain");
      if (text) send({ type: "type_text", text });
    }

    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("keyup", handleKeyUp);
    el.addEventListener("paste", handlePaste);
    return () => {
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("keyup", handleKeyUp);
      el.removeEventListener("paste", handlePaste);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      tabIndex={0}
      sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", outline: "none", cursor: "default", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Reconnect button -- top-right corner, visible on hover */}
      {hasFrame && (
        <Box sx={{ position: "absolute", top: 4, right: 4, opacity: 0, "&:hover": { opacity: 1 }, transition: "opacity 0.2s" }}>
          <Tooltip title="Reconnect">
            <IconButton size="small" onClick={reconnect} sx={{ bgcolor: "rgba(0,0,0,0.5)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {!hasFrame && (
        <Box sx={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, maxWidth: 400 }}>
          <CircularProgress size={32} />
          <Typography color="grey.500">{statusMsg}</Typography>
          <LinearProgress sx={{ width: 200 }} />
          {statusMsg.toLowerCase().includes("install") && (
            <Alert severity="info" sx={{ width: "100%" }}>
              First-time setup: installing dependencies. This only happens once.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}

function domKeyToScancode(e: KeyboardEvent): { code: number; extended: boolean } | null {
  const map: Record<string, [number, boolean]> = {
    Escape: [0x01, false], Digit1: [0x02, false], Digit2: [0x03, false],
    Digit3: [0x04, false], Digit4: [0x05, false], Digit5: [0x06, false],
    Digit6: [0x07, false], Digit7: [0x08, false], Digit8: [0x09, false],
    Digit9: [0x0a, false], Digit0: [0x0b, false], Minus: [0x0c, false],
    Equal: [0x0d, false], Backspace: [0x0e, false], Tab: [0x0f, false],
    KeyQ: [0x10, false], KeyW: [0x11, false], KeyE: [0x12, false],
    KeyR: [0x13, false], KeyT: [0x14, false], KeyY: [0x15, false],
    KeyU: [0x16, false], KeyI: [0x17, false], KeyO: [0x18, false],
    KeyP: [0x19, false], BracketLeft: [0x1a, false], BracketRight: [0x1b, false],
    Enter: [0x1c, false], ControlLeft: [0x1d, false],
    KeyA: [0x1e, false], KeyS: [0x1f, false], KeyD: [0x20, false],
    KeyF: [0x21, false], KeyG: [0x22, false], KeyH: [0x23, false],
    KeyJ: [0x24, false], KeyK: [0x25, false], KeyL: [0x26, false],
    Semicolon: [0x27, false], Quote: [0x28, false], Backquote: [0x29, false],
    ShiftLeft: [0x2a, false], Backslash: [0x2b, false],
    KeyZ: [0x2c, false], KeyX: [0x2d, false], KeyC: [0x2e, false],
    KeyV: [0x2f, false], KeyB: [0x30, false], KeyN: [0x31, false],
    KeyM: [0x32, false], Comma: [0x33, false], Period: [0x34, false],
    Slash: [0x35, false], ShiftRight: [0x36, false],
    NumpadMultiply: [0x37, false], AltLeft: [0x38, false],
    Space: [0x39, false], CapsLock: [0x3a, false],
    F1: [0x3b, false], F2: [0x3c, false], F3: [0x3d, false],
    F4: [0x3e, false], F5: [0x3f, false], F6: [0x40, false],
    F7: [0x41, false], F8: [0x42, false], F9: [0x43, false],
    F10: [0x44, false], F11: [0x57, false], F12: [0x58, false],
    NumLock: [0x45, false], ScrollLock: [0x46, false],
    Insert: [0x52, true], Delete: [0x53, true],
    Home: [0x47, true], End: [0x4f, true],
    PageUp: [0x49, true], PageDown: [0x51, true],
    ArrowUp: [0x48, true], ArrowDown: [0x50, true],
    ArrowLeft: [0x4b, true], ArrowRight: [0x4d, true],
    ControlRight: [0x1d, true], AltRight: [0x38, true],
    MetaLeft: [0x5b, true], MetaRight: [0x5c, true],
    NumpadEnter: [0x1c, true], NumpadDivide: [0x35, true],
  };

  const entry = map[e.code];
  if (entry) return { code: entry[0], extended: entry[1] };
  return null;
}
