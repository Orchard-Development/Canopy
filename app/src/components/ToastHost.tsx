import { useEffect, useRef, useCallback, useState } from "react";
import { Alert, IconButton, useTheme, Slide, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { ToastEntry, ToastApi, ToastSeverity } from "../hooks/useToast";

interface Props {
  visible: ToastEntry[];
  onDismiss: ToastApi["dismiss"];
}

function useSeverityColor(severity: ToastSeverity): { bg: string; color: string } {
  const theme = useTheme();
  const p = theme.palette;
  switch (severity) {
    case "success": return { bg: p.success.main, color: p.success.contrastText };
    case "error": return { bg: p.error.main, color: p.error.contrastText };
    case "warning": return { bg: p.warning.main, color: p.warning.contrastText };
    case "info":
    default: return { bg: p.primary.main, color: p.primary.contrastText };
  }
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: number) => void }) {
  const colors = useSeverityColor(entry.severity);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const exitingRef = useRef(false);
  const [exiting, setExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    setTimeout(() => onDismiss(entry.id), 500);
  }, [entry.id, onDismiss]);

  useEffect(() => {
    if (entry.duration != null && entry.duration > 0) {
      timerRef.current = setTimeout(handleDismiss, entry.duration);
      return () => clearTimeout(timerRef.current);
    }
  }, [entry.duration, handleDismiss]);

  return (
    <Slide direction="up" in={!exiting} mountOnEnter unmountOnExit>
      <Alert
        severity={entry.severity}
        variant="filled"
        icon={false}
        action={
          <>
            {entry.action}
            <IconButton size="small" color="inherit" onClick={handleDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
        sx={{
          minWidth: 300,
          bgcolor: colors.bg,
          color: colors.color,
          opacity: exiting ? 0 : 1,
          transition: "opacity 0.5s ease-out",
          "& .MuiAlert-action": { color: colors.color },
          "& .MuiAlert-icon": { color: colors.color },
        }}
      >
        {entry.message}
      </Alert>
    </Slide>
  );
}

export function ToastHost({ visible, onDismiss }: Props) {
  if (visible.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: (t) => t.zIndex.snackbar,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 1,
        pointerEvents: "none",
        "& > *": { pointerEvents: "auto" },
      }}
    >
      {visible.map((entry) => (
        <ToastItem key={entry.id} entry={entry} onDismiss={onDismiss} />
      ))}
    </Box>
  );
}
