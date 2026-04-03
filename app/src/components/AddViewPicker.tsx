import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  Box,
} from "@mui/material";
import ExtensionIcon from "@mui/icons-material/Extension";
import ParkIcon from "@mui/icons-material/Park";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DevicesIcon from "@mui/icons-material/Devices";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import DescriptionIcon from "@mui/icons-material/Description";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import WidgetsIcon from "@mui/icons-material/Widgets";
import TerminalIcon from "@mui/icons-material/Terminal";
import HistoryIcon from "@mui/icons-material/History";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HubIcon from "@mui/icons-material/Hub";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { api } from "../lib/api";
import type { OrchardViewRecord } from "../lib/api";

const ICON_MAP: Record<string, React.ReactNode> = {
  Park: <ParkIcon />,
  Analytics: <AnalyticsIcon />,
  ChatBubbleOutline: <ChatBubbleOutlineIcon />,
  Devices: <DevicesIcon />,
  Extension: <ExtensionIcon />,
  Lightbulb: <LightbulbIcon />,
  Description: <DescriptionIcon />,
  Widgets: <WidgetsIcon />,
  Terminal: <TerminalIcon />,
  History: <HistoryIcon />,
  AccountTree: <AccountTreeIcon />,
  Hub: <HubIcon />,
  FolderOpen: <FolderOpenIcon />,
};

function resolveIcon(name: string): React.ReactNode {
  return ICON_MAP[name] ?? <ExtensionIcon />;
}

interface AvailableView {
  slug: string;
  label: string;
  icon: string;
  description: string;
  routePath: string;
  component: string;
  source: string;
}

const BUNDLED_VIEWS: AvailableView[] = [
  { slug: "chat", label: "Chat", icon: "ChatBubbleOutline", description: "AI assistant", routePath: "/ai", component: "bundled:Chat", source: "bundled" },
  { slug: "proposals", label: "Proposals", icon: "Description", description: "Design proposals", routePath: "/proposals", component: "bundled:Proposals", source: "bundled" },
  { slug: "capabilities", label: "Capabilities", icon: "Extension", description: "Installed capabilities", routePath: "/capabilities", component: "bundled:Capabilities", source: "bundled" },
  { slug: "interfaces", label: "Interfaces", icon: "Devices", description: "Connected interfaces", routePath: "/interfaces", component: "bundled:Interfaces", source: "bundled" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  orchardId: string;
}

export function AddViewPicker({ open, onClose, orchardId }: Props) {
  const [existing, setExisting] = useState<OrchardViewRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orchardId) return;
    setLoading(true);
    api.listOrchardViews(orchardId)
      .then(setExisting)
      .catch(() => setExisting([]))
      .finally(() => setLoading(false));
  }, [open, orchardId]);

  // Views already in the nav (hardcoded defaults + DB rows)
  const defaultSlugs = new Set([
    "workspace", "chat", "proposals",
    "interfaces", "capabilities", "settings",
  ]);
  const existingSlugs = new Set(existing.map((v) => v.slug));
  const available = BUNDLED_VIEWS.filter(
    (v) => !existingSlugs.has(v.slug) && !defaultSlugs.has(v.slug),
  );

  async function handleAdd(view: AvailableView) {
    await api.createOrchardView(orchardId, {
      slug: view.slug,
      label: view.label,
      icon: view.icon,
      source: "default",
      routePath: view.routePath,
      component: view.component,
    });
    // Refresh the existing list
    const updated = await api.listOrchardViews(orchardId);
    setExisting(updated);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add View</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : available.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            All views are already added to this orchard.
          </Typography>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Bundled Views
            </Typography>
            <List disablePadding>
              {available.map((v) => (
                <ListItemButton key={v.slug} onClick={() => handleAdd(v)} sx={{ borderRadius: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {resolveIcon(v.icon)}
                  </ListItemIcon>
                  <ListItemText primary={v.label} secondary={v.description} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
