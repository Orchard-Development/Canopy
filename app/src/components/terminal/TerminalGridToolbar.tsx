import { useState } from "react";
import { Box, Button, Menu, MenuItem, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CodeIcon from "@mui/icons-material/Code";
import TerminalIcon from "@mui/icons-material/Terminal";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { OrchardIcon } from "./OrchardIcon";

const PRESETS = [
  { label: "Claude Code", command: "claude", args: ["--dangerously-skip-permissions"], icon: <SmartToyIcon /> },
  { label: "Codex", command: "codex", args: ["--full-auto"], icon: <CodeIcon /> },
  { label: "Orchard", command: "opencode", args: [] as string[], icon: <OrchardIcon /> },
  { label: "Shell", command: "", args: [] as string[], icon: <TerminalIcon /> },
];

export type GridColumns = "auto" | "2" | "3" | "4" | "5" | "6";

interface Props {
  columns: GridColumns;
  onColumnsChange: (cols: GridColumns) => void;
  onSpawn: (command: string, args: string[], label: string) => void;
}

export function TerminalGridToolbar({ columns, onColumnsChange, onSpawn }: Props) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const theme = useTheme();
  const bg = theme.palette.background.default;

  return (
    <Box sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      mb: 2,
      position: "sticky",
      top: 0,
      zIndex: 10,
      py: 1,
      px: 1,
      mx: -1,
      backdropFilter: "blur(12px)",
      backgroundColor: bg.startsWith("#")
        ? `${bg}cc`
        : bg,
      borderBottom: 1,
      borderColor: "divider",
      borderRadius: 1,
    }}>
      <Typography variant="h5" fontWeight={700}>Terminals</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <ToggleButtonGroup
          value={columns}
          exclusive
          size="small"
          onChange={(_, val) => val && onColumnsChange(val)}
          sx={{ height: 32 }}
        >
          <ToggleButton value="auto"><ViewModuleIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="2">2</ToggleButton>
          <ToggleButton value="3">3</ToggleButton>
          <ToggleButton value="4">4</ToggleButton>
          <ToggleButton value="5">5</ToggleButton>
          <ToggleButton value="6">6</ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          New
        </Button>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          {PRESETS.map((preset) => (
            <MenuItem
              key={preset.label}
              onClick={() => { setMenuAnchor(null); onSpawn(preset.command, preset.args, preset.label); }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {preset.icon}
                <span>{preset.label}</span>
              </Stack>
            </MenuItem>
          ))}
        </Menu>
      </Stack>
    </Box>
  );
}
