import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Popover,
  Typography,
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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LanIcon from "@mui/icons-material/Lan";
import { useNavigate } from "react-router-dom";
import { setRemoteOrchard, type ProjectRecord, type MeshStatus } from "../lib/api";
import { useActiveProject } from "../hooks/useActiveProject";
import { ProjectLogo } from "./project/ProjectLogo";

interface RemoteProject extends ProjectRecord {
  _node: string;
  _httpUrl: string;
  _token: string;
}

const ORDER_KEY = "orchard:project-order";

function loadOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOrder(ids: string[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
}

function sortByOrder(projects: ProjectRecord[], order: string[]): ProjectRecord[] {
  if (order.length === 0) return projects;
  const indexed = new Map(projects.map((p) => [p.id, p]));
  const sorted: ProjectRecord[] = [];
  for (const id of order) {
    const p = indexed.get(id);
    if (p) {
      sorted.push(p);
      indexed.delete(id);
    }
  }
  for (const p of indexed.values()) sorted.push(p);
  return sorted;
}

function getBranding(p: ProjectRecord) {
  const b = p.config?.branding as Record<string, string> | undefined;
  return { logoUrl: b?.logoUrl, faviconUrl: b?.faviconUrl };
}

export function ProjectSwitcher() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [remoteProjects, setRemoteProjects] = useState<RemoteProject[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const navigate = useNavigate();
  const { project: active, activate } = useActiveProject();

  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((list: ProjectRecord[]) => setProjects(sortByOrder(list, loadOrder())))
      .catch(() => {});
    fetch("/api/mesh/status")
      .then((r) => r.json())
      .then(async (status: MeshStatus) => {
        const remote: RemoteProject[] = [];
        for (const node of status.connected_nodes) {
          if (!node.token || !node.http_url) continue;
          try {
            const res = await fetch(`${node.http_url}/api/projects`, {
              headers: { Authorization: `Bearer ${node.token}` },
            });
            if (!res.ok) continue;
            const nodeProjects: ProjectRecord[] = await res.json();
            for (const p of nodeProjects) {
              remote.push({ ...p, _node: node.name, _httpUrl: node.http_url, _token: node.token });
            }
          } catch { /* node unreachable */ }
        }
        setRemoteProjects(remote);
      })
      .catch(() => {});
  }, [open]);

  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      setProjects((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(overIdx, 0, moved);
        saveOrder(next.map((p) => p.id));
        return next;
      });
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx]);

  const label = active
    ? `${active.name}${activeNode ? " (remote)" : ""}`
    : "No project";

  const activeBranding = active ? getBranding(active) : {};

  function handleSelect(p: ProjectRecord) {
    setRemoteOrchard(null, null);
    setActiveNode(null);
    activate(p);
    setOpen(false);
    navigate(`/projects/${p.id}`, { replace: true });
  }

  function handleSelectRemote(p: RemoteProject) {
    setRemoteOrchard(p._httpUrl, p._token);
    setActiveNode(p._node);
    activate(p);
    setOpen(false);
    navigate(`/projects/${p.id}`, { replace: true });
  }

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          cursor: "pointer",
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {active && (
          <ProjectLogo
            name={active.name}
            logoUrl={activeBranding.logoUrl}
            faviconUrl={activeBranding.faviconUrl}
            size={24}
          />
        )}
        <Typography
          variant="h6"
          noWrap
          sx={{
            fontWeight: 700,
            letterSpacing: 0.2,
            minWidth: 0,
            flexShrink: 1,
            fontSize: "1.15rem",
          }}
        >
          {label}
        </Typography>
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
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
          paper: { sx: { width: 320, maxHeight: 400, mt: 0.5 } },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Switch project
          </Typography>
        </Box>
        {projects.length === 0 && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No projects found
            </Typography>
          </Box>
        )}
        <List dense disablePadding sx={{ pb: 1 }}>
          {projects.map((p, idx) => {
            const b = getBranding(p);
            return (
              <ListItemButton
                key={p.id}
                selected={active?.id === p.id && !activeNode}
                onClick={() => handleSelect(p)}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
                onDragEnd={handleDragEnd}
                sx={{
                  px: 2,
                  py: 0.75,
                  opacity: dragIdx === idx ? 0.4 : 1,
                  bgcolor: overIdx === idx && dragIdx !== null && dragIdx !== idx
                    ? "action.hover"
                    : undefined,
                  transition: "background-color 0.15s",
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ProjectLogo name={p.name} logoUrl={b.logoUrl} faviconUrl={b.faviconUrl} size={28} />
                </ListItemIcon>
                <ListItemText
                  primary={p.name}
                  secondary={p.description || p.root_path}
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: active?.id === p.id ? 600 : 400,
                  }}
                  secondaryTypographyProps={{
                    variant: "caption",
                    noWrap: true,
                  }}
                />
                {active?.id === p.id && !activeNode && (
                  <Chip
                    icon={<CheckIcon sx={{ fontSize: 14 }} />}
                    label="Active"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 1, height: 22, fontSize: 11 }}
                  />
                )}
                <DragIndicatorIcon
                  sx={{ fontSize: 16, color: "text.disabled", ml: 0.5, cursor: "grab", flexShrink: 0 }}
                />
              </ListItemButton>
            );
          })}
          {remoteProjects.length > 0 && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ px: 2, py: 0.75 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Remote orchards
                </Typography>
              </Box>
              {remoteProjects.map((p) => {
                const b = getBranding(p);
                return (
                  <ListItemButton
                    key={`${p._node}:${p.id}`}
                    selected={active?.id === p.id && activeNode === p._node}
                    onClick={() => handleSelectRemote(p)}
                    sx={{ px: 2, py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <ProjectLogo name={p.name} logoUrl={b.logoUrl} faviconUrl={b.faviconUrl} size={28} />
                    </ListItemIcon>
                    <ListItemText
                      primary={p.name}
                      secondary={p._node.split("@")[0]}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: active?.id === p.id && activeNode === p._node ? 600 : 400,
                      }}
                      secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                    />
                    {active?.id === p.id && activeNode === p._node && (
                      <Chip
                        icon={<CheckIcon sx={{ fontSize: 14 }} />}
                        label="Active"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ ml: 1, height: 22, fontSize: 11 }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </>
          )}
          <Divider sx={{ my: 0.5 }} />
          <ListItemButton
            onClick={() => { setOpen(false); navigate("/projects/new"); }}
            sx={{ px: 2, py: 0.75 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <AddIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="New Project"
              primaryTypographyProps={{ variant: "body2", color: "primary" }}
            />
          </ListItemButton>
        </List>
      </Popover>
    </>
  );
}
