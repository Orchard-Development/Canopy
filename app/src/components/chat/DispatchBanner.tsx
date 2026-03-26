import { useEffect, useRef } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";

interface Props {
  summary: string;
  ready: boolean;
  quick: boolean;
  onDispatch: (summary: string) => void;
}

export function DispatchBanner({ summary, ready, quick, onDispatch }: Props) {
  const firedRef = useRef(false);

  // Quick dispatch: fire automatically once the payload is ready
  useEffect(() => {
    if (quick && ready && !firedRef.current) {
      firedRef.current = true;
      onDispatch(summary);
    }
  }, [quick, ready, summary, onDispatch]);

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        border: 1,
        borderColor: "primary.main",
        borderRadius: 1,
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="primary.main" fontWeight={600}>
          {quick
            ? ready ? "Dispatched" : "Dispatching..."
            : ready ? "Ready to dispatch" : "Preparing dispatch..."}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {summary}
        </Typography>
      </Box>
      {quick ? (
        !ready && <CircularProgress size={20} />
      ) : (
        <Button
          variant="contained"
          size="small"
          startIcon={
            ready
              ? <RocketLaunchIcon />
              : <CircularProgress size={16} color="inherit" />
          }
          onClick={() => onDispatch(summary)}
          disabled={!ready}
          sx={{ flexShrink: 0 }}
        >
          Dispatch
        </Button>
      )}
    </Box>
  );
}
