/**
 * Remote terminal rendered via xterm.js, connected through Supabase
 * Broadcast channels instead of a local WebSocket.
 */

import { useEffect, useRef, useCallback } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { terminalOptions, createTerminalTheme } from "../../lib/xterm-theme";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { sendCommand } from "../../lib/remote-commands";

interface Props {
  sessionId: string;
  scrollback?: string;
  onExit?: (code: number) => void;
}

export function RemoteTerminal({ sessionId, scrollback, onExit }: Props) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const handleInput = useCallback(
    (data: string) => {
      sendCommand("terminal:input", { sessionId, data });
    },
    [sessionId],
  );

  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !supabaseConfigured) return;

    const term = new Terminal(terminalOptions(themeRef.current));

    const fit = new FitAddon();
    fitRef.current = fit;
    termRef.current = term;

    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    // Write scrollback if provided
    if (scrollback) {
      term.write(scrollback);
    }

    // Forward keyboard input to remote session
    term.onData(handleInput);

    // Subscribe to Supabase Broadcast for live output
    const channel = supabase
      .channel(`terminal:${sessionId}`)
      .on("broadcast", { event: "output" }, (msg: { payload: { data: string } }) => {
        term.write(msg.payload.data);
      })
      .on("broadcast", { event: "exit" }, (msg: { payload: { exitCode: number } }) => {
        onExitRef.current?.(msg.payload.exitCode);
      })
      .subscribe();

    // Handle resize
    const ro = new ResizeObserver(() => {
      fit.fit();
      const dims = fit.proposeDimensions();
      if (dims) {
        sendCommand("terminal:resize", {
          sessionId,
          cols: dims.cols,
          rows: dims.rows,
        });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      channel.unsubscribe();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [sessionId, scrollback, handleInput]);

  // Update terminal theme in-place on dark/light toggle
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = createTerminalTheme(theme);
  }, [theme]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        bgcolor: "background.default",
        "& .xterm": { height: "100%", padding: 1 },
      }}
    />
  );
}
