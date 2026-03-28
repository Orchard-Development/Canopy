/**
 * Live interactive desktop window view embedded in a chat bubble.
 *
 * Renders desktop mirror frames on a canvas with window chrome.
 * Users can click, type, and scroll directly on the canvas to
 * interact with the mirrored desktop application.
 */

import { useRef, useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import MouseIcon from "@mui/icons-material/Mouse";
import { useDesktopSession } from "../../hooks/useDesktopSession";
import type { Channel } from "phoenix";

interface WindowTarget {
  title?: string;
  app?: string;
  pid?: number;
  bundleId?: string;
}

interface Props {
  sessionId: string;
  channel: Channel | null;
  windowTitle?: string;
  windowTarget?: WindowTarget;
}

export function DesktopEmbed({ sessionId, channel, windowTitle, windowTarget }: Props) {
  const { title, isLive, error, canvasRef, handleClick, handleKeyDown, handleScroll, retry } =
    useDesktopSession(sessionId, channel, windowTitle, windowTarget);
  const [hasFrame, setHasFrame] = useState(false);
  const [focused, setFocused] = useState(false);

  // Detect first frame arrival
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current && canvasRef.current.width > 0) {
        setHasFrame(true);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [canvasRef]);

  const handleClose = () => {
    if (channel && sessionId) {
      channel.push("desktop:close", { session_id: sessionId });
    }
  };

  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 1,
        borderRadius: 1.5,
        overflow: "hidden",
        border: 2,
        borderColor: focused ? "primary.main" : "divider",
        bgcolor: "background.default",
        transition: "border-color 0.15s",
      }}
    >
      {/* Window chrome */}
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          bgcolor: "action.hover",
          borderBottom: 1,
          borderColor: "divider",
          borderRadius: 0,
          minHeight: 36,
        }}
      >
        <DesktopWindowsIcon
          sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }}
        />

        {/* Window title */}
        <Box
          sx={{
            flex: 1,
            px: 1,
            py: 0.25,
            bgcolor: "background.paper",
            borderRadius: 1,
            fontSize: "0.8rem",
            color: "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minHeight: 24,
            display: "flex",
            alignItems: "center",
          }}
        >
          {title || "Desktop Window"}
        </Box>

        {/* Interactive indicator */}
        {isLive && (
          <Tooltip title="Click the window to interact">
            <MouseIcon
              sx={{
                fontSize: 16,
                color: focused ? "primary.main" : "text.disabled",
              }}
            />
          </Tooltip>
        )}

        {/* Live indicator */}
        {isLive && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "success.main",
              flexShrink: 0,
              animation: "pulse 2s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
            }}
          />
        )}

        {/* Close button */}
        {isLive && (
          <Tooltip title="Stop mirroring">
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Paper>

      {/* Canvas viewport */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 10",
          bgcolor: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onWheel={handleScroll}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: hasFrame ? "block" : "none",
            cursor: isLive ? "pointer" : "default",
            outline: "none",
          }}
        />

        {/* Loading state */}
        {!hasFrame && isLive && !error && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="caption" color="text.secondary">
              Connecting to desktop...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              bgcolor: "rgba(0,0,0,0.5)",
              zIndex: 1,
            }}
          >
            <ErrorOutlineIcon sx={{ color: "error.light", fontSize: 32 }} />
            <Typography
              variant="body2"
              sx={{ color: "white", fontWeight: 500, textAlign: "center", px: 2 }}
            >
              {error}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={retry}
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              Retry
            </Button>
          </Box>
        )}

        {/* Click hint overlay */}
        {hasFrame && isLive && !focused && (
          <Box
            sx={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              px: 1.5,
              py: 0.5,
              bgcolor: "rgba(0,0,0,0.6)",
              borderRadius: 1,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <Typography variant="caption" sx={{ color: "white", fontSize: 11 }}>
              Click to interact
            </Typography>
          </Box>
        )}

        {/* Session ended overlay */}
        {!isLive && !error && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.5)",
              zIndex: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "white", fontWeight: 500 }}
            >
              Session ended
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
