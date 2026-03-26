/**
 * Embedded web browser -- Electron webview with Chrome-like URL bar and navigation controls.
 * Falls back to iframe when webview is unavailable (non-Electron environments).
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Box, TextField, IconButton, Tooltip, Paper } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Refresh from "@mui/icons-material/Refresh";
import OpenInNew from "@mui/icons-material/OpenInNew";

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  onTitleChange?: (title: string) => void;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Detect Electron by checking for the webview element support
const isElectron = typeof window !== "undefined" && navigator.userAgent.includes("Electron");

export function BrowserFrame({ url, onUrlChange, onTitleChange }: Props) {
  const [inputValue, setInputValue] = useState(url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const webviewRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync input when url prop changes
  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const navigateTo = useCallback(
    (raw: string) => {
      const dest = normalizeUrl(raw);
      if (!dest) return;
      setInputValue(dest);
      onUrlChange(dest);
      if (isElectron && webviewRef.current) {
        (webviewRef.current as any).loadURL(dest);
      }
    },
    [onUrlChange],
  );

  // Wire up webview events after mount
  useEffect(() => {
    const wv = webviewRef.current as any;
    if (!wv || !isElectron) return;

    function onNavigate(e: any) {
      const newUrl = e.url ?? e.detail?.url;
      if (newUrl) {
        setInputValue(newUrl);
        onUrlChange(newUrl);
      }
      setCanGoBack(wv.canGoBack());
      setCanGoForward(wv.canGoForward());
    }

    function onTitle(e: any) {
      const title = e.title ?? e.detail?.title;
      if (title) onTitleChange?.(title);
    }

    wv.addEventListener("did-navigate", onNavigate);
    wv.addEventListener("did-navigate-in-page", onNavigate);
    wv.addEventListener("page-title-updated", onTitle);

    return () => {
      wv.removeEventListener("did-navigate", onNavigate);
      wv.removeEventListener("did-navigate-in-page", onNavigate);
      wv.removeEventListener("page-title-updated", onTitle);
    };
  }, [onUrlChange, onTitleChange]);

  function goBack() {
    if (isElectron) {
      (webviewRef.current as any)?.goBack();
    }
  }

  function goForward() {
    if (isElectron) {
      (webviewRef.current as any)?.goForward();
    }
  }

  function refresh() {
    if (isElectron) {
      (webviewRef.current as any)?.reload();
    } else {
      setRefreshKey((k) => k + 1);
    }
  }

  function openExternally() {
    window.open(normalizeUrl(inputValue), "_blank");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateTo(inputValue);
    }
  }

  function handleIframeLoad() {
    if (!onTitleChange || !iframeRef.current) return;
    try {
      const title = iframeRef.current.contentDocument?.title;
      if (title) onTitleChange(title);
    } catch {
      // Cross-origin
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.5,
          height: 40,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
          borderRadius: 0,
        }}
      >
        <Tooltip title="Back">
          <span>
            <IconButton size="small" onClick={goBack} disabled={!canGoBack}>
              <ArrowBack fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Forward">
          <span>
            <IconButton size="small" onClick={goForward} disabled={!canGoForward}>
              <ArrowForward fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Refresh">
          <IconButton size="small" onClick={refresh}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>

        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          fullWidth
          placeholder="Enter URL"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.85rem",
                height: 30,
                bgcolor: "background.paper",
                borderRadius: 1,
              },
            },
          }}
          sx={{ mx: 0.5 }}
        />

        <Tooltip title="Open in browser">
          <IconButton size="small" onClick={openExternally}>
            <OpenInNew fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {isElectron ? (
          <webview
            ref={webviewRef as any}
            src={url}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={url}
            onLoad={handleIframeLoad}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Embedded browser"
          />
        )}
      </Box>
    </Box>
  );
}
