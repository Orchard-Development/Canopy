import { useEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { terminalOptions, createTerminalTheme } from "../lib/xterm-theme";
import { usePersistedState } from "./usePersistedState";
import { getRemoteOrchard, PROXY_BASE } from "../lib/api";

const BASE_FONT_SIZE = 14;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 40;
const FONT_STEP = 2;

// Minimum dimensions sent to the PTY. TUI programs (Claude Code, vim, etc.)
// break badly below ~80 cols. Clamping here means the PTY gets sane dimensions
// even when the card container is small; xterm still scrolls/clips locally.
const MIN_COLS = 80;
const MIN_ROWS = 10;

export type SessionState = "running" | "waiting" | "idle";

/** Regex matching OSC escape: \x1b]ctx:state=<state>\x07 */
const OSC_STATE_RE = /\x1b\]ctx:state=(running|waiting|idle)\x07/g;

interface Options {
  sessionId: string;
  active?: boolean;
  suspendResize?: boolean;
  onExit?: (code: number) => void;
  onStateChange?: (state: SessionState) => void;
  onInput?: (sessionId: string, data: string) => void;
}

function clampDims(term: Terminal): { cols: number; rows: number } {
  return {
    cols: Math.max(MIN_COLS, term.cols),
    rows: Math.max(MIN_ROWS, term.rows),
  };
}

function escapePath(p: string) {
  return /[^A-Za-z0-9_./:@-]/.test(p) ? `'${p.replace(/'/g, "'\\''")}'` : p;
}

/** True when the UI is accessed via a remote tunnel (not localhost). */
function isRemoteSession(): boolean {
  const h = window.location.hostname;
  return h !== "localhost" && h !== "127.0.0.1" && h !== "[::1]";
}

function uploadFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1] ?? "";
      const uploadPath = `playground/uploads/${Date.now()}-${file.name}`;
      fetch("/api/fs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: uploadPath, content: b64 }),
      })
        .then((r) => {
          if (!r.ok) {
            console.warn(`[drop] upload failed: ${r.status} ${r.statusText}`);
            return null;
          }
          return r.json();
        })
        .then((j: { path: string } | null) => resolve(j?.path ?? null))
        .catch((err) => {
          console.warn("[drop] upload error:", err);
          resolve(null);
        });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function useTerminal({
  sessionId,
  active = true,
  suspendResize,
  onExit,
  onStateChange,
  onInput,
}: Options) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;
  const suspendResizeRef = useRef(suspendResize);
  suspendResizeRef.current = suspendResize;
  const [dragOver, setDragOver] = useState(false);
  const dragCountRef = useRef(0);
  const [focused, setFocused] = useState(false);
  const [bufferText, setBufferText] = useState("");
  const bufferTickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fontSize, setFontSize] = usePersistedState<number>("terminal.fontSize", BASE_FONT_SIZE);
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !sessionId) return;

    const opts = terminalOptions(themeRef.current);
    opts.fontSize = fontSizeRef.current;
    const term = new Terminal(opts);

    const fit = new FitAddon();
    fitRef.current = fit;
    termRef.current = term;

    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon((_event, uri) => {
      window.open(uri, "_blank", "noopener");
    }));
    term.open(el);

    const onFocusIn = () => setFocused(true);
    const onFocusOut = () => setFocused(false);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    term.focus();

    // Only fit when the container has real dimensions. Fitting a
    // zero-sized container corrupts xterm's renderer (white screen).
    // If dimensions aren't ready yet (drawer animating, hidden tab),
    // poll until they are -- the ResizeObserver alone isn't reliable
    // here because it may fire before layout completes.
    const safeFit = () => {
      if (!fitRef.current || !containerRef.current) return false;
      if (containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
        fitRef.current.fit();
        return true;
      }
      return false;
    };
    if (!safeFit()) {
      let retries = 0;
      const poll = () => {
        if (!fitRef.current) return; // disposed
        if (safeFit()) return;
        if (++retries < 20) setTimeout(poll, 50);
      };
      requestAnimationFrame(poll);
    }

    // On Windows/Linux, Ctrl+V sends ASCII 22 instead of pasting.
    // Intercept it and read from the clipboard API.
    const isMac = /mac|iphone|ipad/i.test(navigator.userAgent);
    if (!isMac) {
      term.attachCustomKeyEventHandler((e) => {
        if (e.type === "keydown" && e.ctrlKey && e.key === "v") {
          navigator.clipboard.readText().then((text) => {
            if (text) term.paste(text);
          });
          return false;
        }
        if (e.type === "keydown" && e.ctrlKey && e.key === "c" && term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection());
          return false;
        }
        return true;
      });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const next = Math.min(MAX_FONT_SIZE, fontSizeRef.current + FONT_STEP);
        fontSizeRef.current = next;
        setFontSize(next);
        term.options.fontSize = next;
        fit.fit();
      } else if (e.key === "-") {
        e.preventDefault();
        const next = Math.max(MIN_FONT_SIZE, fontSizeRef.current - FONT_STEP);
        fontSizeRef.current = next;
        setFontSize(next);
        term.options.fontSize = next;
        fit.fit();
      } else if (e.key === "0") {
        e.preventDefault();
        fontSizeRef.current = BASE_FONT_SIZE;
        setFontSize(BASE_FONT_SIZE);
        term.options.fontSize = BASE_FONT_SIZE;
        fit.fit();
      }
    };
    el.addEventListener("keydown", onKeyDown);

    const remote = getRemoteOrchard();
    let wsUrl: string;
    if (remote.httpUrl && remote.token) {
      const remoteWs = remote.httpUrl.replace(/^http/, "ws");
      wsUrl = `${remoteWs}/ws/terminal/${sessionId}?token=${encodeURIComponent(remote.token)}`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const tokenMatch = document.cookie.match(/(?:^|;\s*)ctx_token=([^;]*)/);
      const tokenParam = tokenMatch ? `?token=${encodeURIComponent(decodeURIComponent(tokenMatch[1]))}` : "";
      wsUrl = `${protocol}//${window.location.host}${PROXY_BASE}/ws/terminal/${sessionId}${tokenParam}`;
    }
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let exitReceived = false;

    const onMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "output") {
          let outData = msg.data as string;
          let stateMatch: RegExpExecArray | null;
          while ((stateMatch = OSC_STATE_RE.exec(outData)) !== null) {
            onStateChangeRef.current?.(stateMatch[1] as SessionState);
          }
          OSC_STATE_RE.lastIndex = 0;
          outData = outData.replace(OSC_STATE_RE, "");
          if (outData) {
            term.write(outData);
            if (bufferTickRef.current) clearTimeout(bufferTickRef.current);
            bufferTickRef.current = setTimeout(() => {
              const buf = term.buffer.active;
              const lines: string[] = [];
              for (let i = 0; i <= buf.length - 1; i++) {
                const line = buf.getLine(i);
                if (line) lines.push(line.translateToString(true));
              }
              setBufferText(lines.join("\n"));
            }, 150);
          }
        } else if (msg.type === "exit") {
          exitReceived = true;
          term.write(
            `\r\n\x1b[90m[process exited with code ${msg.code}]\x1b[0m\r\n`,
          );
          onExitRef.current?.(msg.code);
        } else if (msg.type === "error") {
          term.write(`\r\n\x1b[31m[${msg.message}]\x1b[0m\r\n`);
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    let upgradeFailures = 0;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let opened = false;

      ws.onopen = () => {
        opened = true;
        upgradeFailures = 0;
        if (reconnectAttempt > 0) {
          term.clear();
          reconnectAttempt = 0;
        }
        if (el.clientWidth > 0 && el.clientHeight > 0) fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", ...clampDims(term) }));
        }
        // After scrollback replay (which arrives as a burst of messages
        // right after open), re-send resize to trigger SIGWINCH so the
        // child process redraws its TUI at the correct dimensions.
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            if (el.clientWidth > 0 && el.clientHeight > 0) fit.fit();
            ws.send(JSON.stringify({ type: "resize", ...clampDims(term) }));
          }
        }, 300);
      };

      ws.onmessage = onMessage;

      ws.onclose = (event) => {
        console.warn(`[terminal:${sessionId}] ws close: code=${event.code}`);
        if (disposed || exitReceived) return;
        // If the WS was never opened, the server rejected the upgrade (404/401).
        // Stop reconnecting after a few attempts — the session doesn't exist.
        if (!opened) {
          upgradeFailures++;
          if (upgradeFailures >= 3) {
            term.write("\r\n\x1b[90m[session ended -- view session log for details]\x1b[0m\r\n");
            return;
          }
        }
        term.write("\r\n\x1b[90m[disconnected -- reconnecting...]\x1b[0m\r\n");
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        reconnectAttempt++;
        reconnectTimer = setTimeout(() => {
          if (!disposed) connectWs();
        }, delay);
      };
    };

    connectWs();

    term.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
        onInputRef.current?.(sessionId, data);
      }
    });

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const sendResize = () => {
      if (suspendResizeRef.current) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fit.fit();
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", ...clampDims(term) }));
        }
      }, 120);
    };

    const observer = new ResizeObserver(sendResize);
    observer.observe(el);

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragCountRef.current++;
      if (dragCountRef.current === 1) setDragOver(true);
    };

    const onDragLeave = () => {
      dragCountRef.current--;
      if (dragCountRef.current === 0) setDragOver(false);
    };

    const sendPaths = (paths: string[]) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "input",
          data: paths.map(escapePath).join(" "),
        }),
      );
      term.focus();
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setDragOver(false);
      const ws = wsRef.current;
      if (!e.dataTransfer || !ws || ws.readyState !== WebSocket.OPEN) return;

      const remote = isRemoteSession();
      const ctx = remote
        ? undefined
        : (
            window as unknown as {
              ctx?: { getPathForFile?: (f: File) => string };
            }
          ).ctx;
      const resolved: string[] = [];
      const unresolved: File[] = [];
      for (const file of Array.from(e.dataTransfer.files)) {
        const filePath = remote
          ? undefined
          : (ctx?.getPathForFile?.(file) ??
            (file as File & { path?: string }).path);
        if (filePath) resolved.push(filePath);
        else unresolved.push(file);
      }

      if (unresolved.length === 0) {
        sendPaths(resolved);
        return;
      }

      term.write("\r\n\x1b[90m[uploading dropped file(s)...]\x1b[0m");
      Promise.all(unresolved.map(uploadFile)).then((uploaded) => {
        const all = [
          ...resolved,
          ...(uploaded.filter(Boolean) as string[]),
        ];
        if (all.length === 0) {
          const names = unresolved.map((f) => f.name);
          term.write(
            `\r\n\x1b[33m[drop: upload failed for: ${names.join(", ")}]\x1b[0m\r\n`,
          );
          return;
        }
        term.write("\r\n");
        sendPaths(all);
      });
    };

    const dropEl = dropZoneRef.current ?? el;
    dropEl.addEventListener("dragover", onDragOver);
    dropEl.addEventListener("dragenter", onDragEnter);
    dropEl.addEventListener("dragleave", onDragLeave);
    dropEl.addEventListener("drop", onDrop);

    return () => {
      // 1. Flag — prevents reconnect attempts and short-circuits safeFit()
      disposed = true;

      // 2. Timers — cancel any pending callbacks that reference term/fit/ws
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (resizeTimer) clearTimeout(resizeTimer);

      // 3. Observer — stop before removing listeners so no new resize
      //    callbacks can fire and schedule timers against a disposed terminal
      observer.disconnect();

      // 4. Event listeners — nothing can re-trigger after this point
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      el.removeEventListener("keydown", onKeyDown);
      dropEl.removeEventListener("dragover", onDragOver);
      dropEl.removeEventListener("dragenter", onDragEnter);
      dropEl.removeEventListener("dragleave", onDragLeave);
      dropEl.removeEventListener("drop", onDrop);

      // 5. WebSocket — close before terminal so onmessage can't write to
      //    a disposed terminal
      wsRef.current?.close();
      wsRef.current = null;

      // 6. FitAddon — dispose before terminal (it holds an internal ref)
      fitRef.current?.dispose();
      fitRef.current = null;

      // 7. Terminal — dispose last, after all consumers are torn down
      term.dispose();
      termRef.current = null;
    };
  }, [sessionId]);

  // Update terminal theme in-place when dark/light mode changes.
  // Avoids tearing down and recreating the terminal (which loses
  // scrollback and corrupts the renderer on zero-sized containers).
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = createTerminalTheme(theme);
  }, [theme]);

  // Sync font size across terminal instances
  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    if (term.options.fontSize !== fontSize) {
      term.options.fontSize = fontSize;
      fit.fit();
    }
  }, [fontSize]);

  // Fit terminal once when drawer drag ends
  useEffect(() => {
    if (suspendResize === false && fitRef.current && wsRef.current) {
      const fit = fitRef.current;
      const ws = wsRef.current;
      const term = termRef.current;
      fit.fit();
      if (term && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", ...clampDims(term) }));
      }
    }
  }, [suspendResize]);

  useEffect(() => {
    if (active && termRef.current) {
      termRef.current.scrollToBottom();
      termRef.current.focus();
      // Re-fit when becoming visible -- the container had zero dimensions
      // while hidden (display:none). Use setTimeout to ensure the browser
      // has completed layout after the display change.
      setTimeout(() => {
        const fit = fitRef.current;
        const ws = wsRef.current;
        const term = termRef.current;
        const el = containerRef.current;
        if (!fit || !term || !el) return;
        if (el.clientWidth === 0 || el.clientHeight === 0) return;
        fit.fit();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", ...clampDims(term) }));
        }
      }, 30);
    }
  }, [active]);

  const sendInput = (text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data: text }));
      onInputRef.current?.(sessionId, text);
    }
  };

  return { containerRef, dropZoneRef, termRef, focused, setFocused, dragOver, bufferText, sendInput };
}
