import { Box, Card, CardContent, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { ActivityFeed } from "../activity/ActivityFeed";
import { WorkspacePulse } from "../activity/WorkspacePulse";
import { useActivityFeed } from "../../hooks/useActivityFeed";

export function ActivityCard() {
  const { entries, pulse, lastSync, clear, connected } = useActivityFeed();

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <FiberManualRecordIcon
            sx={{ fontSize: 8, color: connected ? "success.main" : "text.disabled" }}
          />
          <Typography variant="body2" fontWeight={600}>Activity</Typography>
          {entries.length > 0 && (
            <Chip label={entries.length} size="small" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Clear">
            <IconButton size="small" onClick={clear}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {pulse && <WorkspacePulse pulse={pulse} />}
        <Box
          sx={{
            maxHeight: 320,
            overflow: "auto",
            bgcolor: "background.default",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <ActivityFeed entries={entries} lastSync={lastSync} />
        </Box>
      </CardContent>
    </Card>
  );
}
