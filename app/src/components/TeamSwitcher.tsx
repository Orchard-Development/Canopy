import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Popover,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAuth } from "../hooks/useAuth";

export function TeamSwitcher() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { teams, activeTeamId, selectTeam } = useAuth();

  if (teams.length === 0) return null;

  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const label = activeTeam ? activeTeam.name : "Select team";

  function handleSelect(teamId: string) {
    selectTeam(teamId);
    setOpen(false);
  }

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{ fontWeight: 600, minWidth: 0, flexShrink: 1 }}
        >
          {label}
        </Typography>
        <ExpandMoreIcon
          sx={{
            fontSize: 16,
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </Box>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { sx: { width: 240, maxHeight: 300, mt: 0.5 } },
        }}
      >
        <List dense disablePadding>
          {teams.map((team) => (
            <ListItemButton
              key={team.id}
              selected={team.id === activeTeamId}
              onClick={() => handleSelect(team.id)}
              sx={{ px: 2, py: 0.75 }}
            >
              <ListItemText
                primary={team.name}
                primaryTypographyProps={{
                  variant: "body2",
                  fontWeight: team.id === activeTeamId ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  );
}
