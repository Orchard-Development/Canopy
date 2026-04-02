import { useState, useCallback, Suspense, lazy } from "react";
import { Box, CircularProgress, Alert, Typography, Button, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../lib/api";
import { useRootsData } from "./roots/useRootsData";
import StatsBar from "./roots/StatsBar";
import RootsSidebar from "./roots/RootsSidebar";
import type { SelectedItem } from "./roots/types";

const RootsCanvas = lazy(() => import("./roots/RootsCanvas"));

export default function RootsView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const bg = theme.palette.background.default;

  const [filterUserId, setFilterUserId] = useState<string | undefined>();
  const { data, loading, error, indexing, refetch } = useRootsData(filterUserId);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [hoveredSeed, setHoveredSeed] = useState<string | null>(null);
  const [reprofiling, setReprofiling] = useState(false);
  const [reprofileError, setReprofileError] = useState<string | null>(null);

  const handleReprofile = useCallback(async () => {
    setReprofiling(true);
    setReprofileError(null);
    try {
      await api.reprofile();
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setReprofileError(`Reprofile failed: ${msg}`);
    } finally {
      setReprofiling(false);
    }
  }, [refetch]);

  if (loading && !data) {
    return (
      <Box sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", bgcolor: bg, gap: 2,
      }}>
        <CircularProgress size={32} color="primary" />
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
          Loading roots data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, bgcolor: bg, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          size="small"
          startIcon={reprofiling ? <CircularProgress size={14} /> : <RefreshIcon />}
          disabled={reprofiling}
          onClick={handleReprofile}
          sx={{ alignSelf: "flex-start", textTransform: "none" }}
        >
          {reprofiling ? "Reprofiling..." : "Retry Reprofile"}
        </Button>
      </Box>
    );
  }

  if (indexing) {
    return (
      <Box sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", bgcolor: bg, gap: 2,
      }}>
        <CircularProgress size={32} color="primary" />
        <Typography sx={{ color: "text.primary", fontSize: 15 }}>
          Indexing sessions...
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
          Building your roots for the first time. This may take a moment.
        </Typography>
      </Box>
    );
  }

  if (!data?.sessions?.length) {
    return (
      <Box sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", bgcolor: bg, gap: 1.5,
      }}>
        <Typography sx={{ color: "text.secondary", fontSize: 15 }}>
          Your roots are empty.
        </Typography>
        <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
          Start a coding session, then reprofile to see it here.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={reprofiling ? <CircularProgress size={14} /> : <RefreshIcon />}
          disabled={reprofiling}
          onClick={handleReprofile}
          sx={{ mt: 1, textTransform: "none" }}
        >
          {reprofiling ? "Reprofiling..." : "Reprofile Now"}
        </Button>
        {reprofileError && (
          <Typography sx={{ color: "text.disabled", fontSize: 12, mt: 0.5, maxWidth: 300, textAlign: "center" }}>
            {reprofileError}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%",
      bgcolor: bg, position: "relative",
    }}>
      <StatsBar
        data={data}
        onReprofile={refetch}
        filterUserId={filterUserId}
        onFilterUserChange={setFilterUserId}
      />

      <Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
        <Suspense fallback={
          <Box sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", bgcolor: bg,
          }}>
            <CircularProgress size={32} color="primary" />
          </Box>
        }>
          <RootsCanvas
            data={data}
            timePosition={Date.now()}
            selected={selected}
            onSelect={setSelected}
            hoveredSeed={hoveredSeed}
            onHoverSeed={setHoveredSeed}
            isDark={isDark}
          />
        </Suspense>

        <RootsSidebar
          data={data}
          selected={selected}
          onClose={() => setSelected(null)}
        />
      </Box>
    </Box>
  );
}
