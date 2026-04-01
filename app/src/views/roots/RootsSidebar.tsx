import { useState, lazy, Suspense } from "react";
import { Box, Typography, IconButton, Divider, alpha } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { OrchardData, SelectedItem } from "./types";
import { SeedDetail, SessionDetail } from "./SidebarDetails";

const TranscriptPanel = lazy(() => import("./TranscriptPanel"));

interface RootsSidebarProps {
  data: OrchardData;
  selected: SelectedItem;
  onClose: () => void;
}

export default function RootsSidebar({ data, selected, onClose }: RootsSidebarProps) {
  const [transcriptId, setTranscriptId] = useState<string | null>(null);

  if (!selected) return null;

  const session = selected.kind === "session"
    ? data.sessions.find((s) => s.id === selected.id)
    : null;

  const showingTranscript = transcriptId !== null;

  return (
    <Box
      sx={(t) => ({
        position: "absolute", top: 40, right: 0, bottom: 60,
        width: showingTranscript ? 520 : 320,
        bgcolor: alpha(t.palette.background.paper, 0.92),
        borderLeft: 1, borderColor: "divider",
        overflowY: showingTranscript ? "hidden" : "auto",
        display: "flex", flexDirection: "column",
        p: 2, zIndex: 1000,
        backdropFilter: "blur(8px)",
        transition: "width 0.2s ease",
      })}
    >
      {showingTranscript ? (
        <Suspense fallback={null}>
          <TranscriptPanel
            sessionId={transcriptId}
            label={session?.label?.slice(0, 80)}
            onBack={() => setTranscriptId(null)}
          />
        </Suspense>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" color="text.primary">
              {selected.kind === "seed" ? "Seed Detail" : "Session Detail"}
            </Typography>
            <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          {selected.kind === "seed" && (
            <SeedDetail data={data} seedName={selected.name} />
          )}
          {selected.kind === "session" && (
            <SessionDetail
              data={data}
              sessionId={selected.id}
              onViewTranscript={() => session && setTranscriptId(session.id)}
            />
          )}
        </>
      )}
    </Box>
  );
}
