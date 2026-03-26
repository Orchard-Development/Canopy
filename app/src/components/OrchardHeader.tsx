import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Badge,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CodeIcon from "@mui/icons-material/Code";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AirIcon from "@mui/icons-material/Air";
import GavelIcon from "@mui/icons-material/Gavel";
import { useNavigate } from "react-router-dom";
import { api, type ProjectRecord } from "../lib/api";
import { useActiveProject } from "../hooks/useActiveProject";

const IDE_ICONS: Record<string, React.ReactElement> = {
  "claude-code": <SmartToyIcon fontSize="small" />,
  codex: <CodeIcon fontSize="small" />,
  cursor: <EditNoteIcon fontSize="small" />,
  windsurf: <AirIcon fontSize="small" />,
};

export function OrchardHeader() {
  const navigate = useNavigate();
  const { project, activate } = useActiveProject();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [ides, setIdes] = useState<Array<{ name: string }>>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    api.listIdes().then(setIdes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!project) return;
    api.listApprovals(project.id).then((a) => setPendingApprovals(a.length)).catch(() => {});
  }, [project?.id]);

  useEffect(() => {
    if (!open) return;
    api.listProjects().then(setProjects).catch(() => {});
  }, [open]);

  async function handleLaunch(ide: string) {
    if (!project) return;
    try {
      const result = await api.launchIde(project.id, ide);
      if (result.method === "session" && result.sessionId) {
        navigate(`/terminal?session=${result.sessionId}&label=${encodeURIComponent(result.label)}`);
      }
    } catch { /* ignore */ }
  }

  if (!project) return null;

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <Box
        ref={anchorRef}
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          borderRadius: 1,
          px: 1,
          py: 0.5,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Typography variant="h5" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
          {project.name}
        </Typography>
        <ExpandMoreIcon
          sx={{
            fontSize: 20,
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
        slotProps={{ paper: { sx: { width: 320, maxHeight: 400, mt: 0.5 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>Switch project</Typography>
        </Box>
        <List dense disablePadding sx={{ pb: 1 }}>
          {projects.map((p) => (
            <ListItemButton
              key={p.id}
              selected={project.id === p.id}
              onClick={() => { activate(p); setOpen(false); navigate(`/projects/${p.id}`, { replace: true }); }}
              sx={{ px: 2, py: 0.5 }}
            >
              <ListItemText
                primary={p.name}
                secondary={p.description || p.root_path}
                primaryTypographyProps={{ variant: "body2", fontWeight: project.id === p.id ? 600 : 400 }}
                secondaryTypographyProps={{ variant: "caption", noWrap: true }}
              />
              {project.id === p.id && (
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
          <Divider sx={{ my: 0.5 }} />
          <ListItemButton
            onClick={() => { setOpen(false); navigate("/projects/new"); }}
            sx={{ px: 2, py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AddIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="New Project"
              primaryTypographyProps={{ variant: "body2", color: "primary" }}
            />
          </ListItemButton>
        </List>
      </Popover>

      <Box sx={{ flex: 1 }} />

      {pendingApprovals > 0 && (
        <Tooltip title={`${pendingApprovals} pending approvals`}>
          <IconButton size="small" onClick={() => navigate(`/projects/${project.id}/approvals`)}>
            <Badge badgeContent={pendingApprovals} color="warning" max={99}>
              <GavelIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      )}
      {ides.map((ide) => (
        <Tooltip key={ide.name} title={`Open in ${ide.name}`}>
          <IconButton size="small" onClick={() => handleLaunch(ide.name)}>
            {IDE_ICONS[ide.name] ?? <CodeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      ))}
    </Stack>
  );
}
