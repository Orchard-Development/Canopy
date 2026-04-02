import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import GroupsIcon from "@mui/icons-material/Groups";
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
      <Typography variant="body2" sx={{ color: "text.disabled", mx: 0.25, userSelect: "none" }}>
        /
      </Typography>
      <Box
        ref={anchorRef}
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <GroupsIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography
          variant="body2"
          noWrap
          sx={{ fontWeight: 500, minWidth: 0, flexShrink: 1, color: "text.secondary" }}
        >
          {label}
        </Typography>
        <ExpandMoreIcon
          sx={{
            fontSize: 16,
            color: "text.disabled",
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
          paper: { sx: { width: 280, maxHeight: 340, mt: 0.5 } },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Switch team
          </Typography>
        </Box>
        <List dense disablePadding sx={{ pb: 1 }}>
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
              {team.id === activeTeamId && (
                <Chip
                  icon={<CheckIcon sx={{ fontSize: 14 }} />}
                  label="Active"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ ml: 1, height: 22, fontSize: 11 }}
                />
              )}
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  );
}
