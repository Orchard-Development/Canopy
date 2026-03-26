import { useState } from "react";
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useMonitorChannel } from "../hooks/useMonitorChannel";
import { MessageFeed } from "../components/events/MessageFeed";
import { PublishPanel } from "../components/events/PublishPanel";

export default function EventMonitor() {
  const { messages, connected, paused, setPaused, clear, publish } =
    useMonitorChannel();
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Chip
          size="small"
          label={connected ? "Connected" : "Disconnected"}
          color={connected ? "success" : "error"}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        <TextField
          size="small"
          placeholder="Filter topics..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ flex: 1, maxWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { fontFamily: "monospace", fontSize: 13 },
            },
          }}
        />
        <Chip size="small" label={`${messages.length} msgs`} variant="outlined" />
        <Tooltip title={paused ? "Resume" : "Pause"}>
          <IconButton size="small" onClick={() => setPaused(!paused)} color={paused ? "warning" : "default"}>
            {paused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}>
          <IconButton
            size="small"
            onClick={() => setAutoScroll(!autoScroll)}
            color={autoScroll ? "primary" : "default"}
          >
            <VerticalAlignBottomIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear">
          <IconButton size="small" onClick={clear}>
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Message feed */}
      <MessageFeed messages={messages} filter={filter} autoScroll={autoScroll} />

      {/* Publish panel */}
      <PublishPanel publish={publish} />
    </Box>
  );
}
