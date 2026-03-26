import { Box, ToggleButtonGroup, ToggleButton, Switch, FormControlLabel } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { DispatchMode } from "../../types/dispatch";

interface Props {
  mode: DispatchMode;
  onModeChange: (mode: DispatchMode) => void;
  autoBuild: boolean;
  onAutoBuildChange: (value: boolean) => void;
}

export function DispatchControls({ mode, onModeChange, autoBuild, onAutoBuildChange }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        onChange={(_, v) => v && onModeChange(v as DispatchMode)}
      >
        <ToggleButton value="proposal">
          <DescriptionIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Plan
        </ToggleButton>
        <ToggleButton value="dispatch">
          <PlayArrowIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Dispatch
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === "proposal" && (
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={autoBuild}
              onChange={(_, v) => onAutoBuildChange(v)}
            />
          }
          label="Auto-build"
          slotProps={{ typography: { variant: "body2" } }}
        />
      )}
    </Box>
  );
}
