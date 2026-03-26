import { useState, useCallback } from "react";
import { Box, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import { IntelFileList, type TaggedItem } from "./IntelFileList";
import { IntelFileDetail } from "./IntelFileDetail";

interface Props {
  projectId: string;
}

export function IntelligenceCard({ projectId }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [selected, setSelected] = useState<TaggedItem | null>(null);
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => {
    setGeneration((g) => g + 1);
    setSelected(null);
  }, []);

  const handleUpdated = useCallback(() => {
    setGeneration((g) => g + 1);
  }, []);

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        height: isMobile ? "auto" : 520,
        minHeight: isMobile ? 300 : undefined,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: isMobile ? "100%" : 320,
          flexShrink: 0,
          borderRight: isMobile ? 0 : 1,
          borderBottom: isMobile ? 1 : 0,
          borderColor: "divider",
          overflow: "hidden",
          maxHeight: isMobile ? 300 : undefined,
        }}
      >
        <IntelFileList
          projectId={projectId}
          selected={selected}
          onSelect={setSelected}
          generation={generation}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        {selected ? (
          <IntelFileDetail
            projectId={projectId}
            item={selected}
            onDeleted={refresh}
            onUpdated={handleUpdated}
          />
        ) : (
          <Box sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "text.secondary",
          }}>
            <Typography variant="body2">Select an item to view</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
