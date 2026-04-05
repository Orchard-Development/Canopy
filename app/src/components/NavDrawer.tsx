import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  Divider,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
} from "@mui/material";
import ParkIcon from "@mui/icons-material/Park";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ExtensionIcon from "@mui/icons-material/Extension";
import HubIcon from "@mui/icons-material/Hub";
import TerminalIcon from "@mui/icons-material/Terminal";
import HistoryIcon from "@mui/icons-material/History";
import DevicesIcon from "@mui/icons-material/Devices";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import DescriptionIcon from "@mui/icons-material/Description";
import WidgetsIcon from "@mui/icons-material/Widgets";
import SettingsIcon from "@mui/icons-material/Settings";
import ShieldIcon from "@mui/icons-material/Shield";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import StorageIcon from "@mui/icons-material/Storage";
import CloudIcon from "@mui/icons-material/Cloud";
import PaletteIcon from "@mui/icons-material/Palette";
import SpeedIcon from "@mui/icons-material/Speed";
import BugReportIcon from "@mui/icons-material/BugReport";
import CodeIcon from "@mui/icons-material/Code";
import ScienceIcon from "@mui/icons-material/Science";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import InventoryIcon from "@mui/icons-material/Inventory";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GroupIcon from "@mui/icons-material/Group";
import MailIcon from "@mui/icons-material/Mail";
import PhotoIcon from "@mui/icons-material/Photo";
import MapIcon from "@mui/icons-material/Map";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import GrassIcon from "@mui/icons-material/Grass";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import AddIcon from "@mui/icons-material/Add";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PsychologyIcon from "@mui/icons-material/Psychology";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { useViewRegistry } from "../hooks/useViewRegistry";
import type { ViewEntry } from "../hooks/useViewRegistry";
import { useActiveProject } from "../hooks/useActiveProject";
import { api } from "../lib/api";

const ICON_MAP: Record<string, React.ReactNode> = {
  Park: <ParkIcon />,
  Analytics: <AnalyticsIcon />,
  ChatBubbleOutline: <ChatBubbleOutlineIcon />,
  Devices: <DevicesIcon />,
  Terminal: <TerminalIcon />,
  History: <HistoryIcon />,
  Hub: <HubIcon />,
  Extension: <ExtensionIcon />,
  Lightbulb: <LightbulbIcon />,
  Description: <DescriptionIcon />,
  Widgets: <WidgetsIcon />,
  Settings: <SettingsIcon />,
  Shield: <ShieldIcon />,
  RocketLaunch: <RocketLaunchIcon />,
  Security: <SecurityIcon />,
  Storage: <StorageIcon />,
  Cloud: <CloudIcon />,
  Palette: <PaletteIcon />,
  Speed: <SpeedIcon />,
  BugReport: <BugReportIcon />,
  Code: <CodeIcon />,
  Science: <ScienceIcon />,
  MonitorHeart: <MonitorHeartIcon />,
  Inventory: <InventoryIcon />,
  CalendarMonth: <CalendarMonthIcon />,
  AttachMoney: <AttachMoneyIcon />,
  Group: <GroupIcon />,
  Mail: <MailIcon />,
  Photo: <PhotoIcon />,
  Map: <MapIcon />,
  MusicNote: <MusicNoteIcon />,
  AccountTree: <AccountTreeIcon />,
  Grass: <GrassIcon />,
  ViewKanban: <ViewKanbanIcon />,
  SmartToy: <SmartToyIcon />,
  Send: <SendIcon />,
  Schedule: <ScheduleIcon />,
  Psychology: <PsychologyIcon />,
  FolderOpen: <FolderOpenIcon />,
};

function resolveIcon(name: string): React.ReactNode {
  return ICON_MAP[name] ?? <ExtensionIcon />;
}

const WIDTH = 72;

interface NavDrawerProps {
  onTerminalToggle?: () => void;
  terminalOpen?: boolean;
  onAddViewClick?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isMobile?: boolean;
  onNavItemClick?: () => void;
}

export function NavDrawer({
  onTerminalToggle,
  terminalOpen,
  onAddViewClick,
  mobileOpen,
  onMobileClose,
  isMobile,
  onNavItemClick,
}: NavDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const { views, loading } = useViewRegistry();

  const mainViews = views.filter((v) => v.placement !== "bottom");
  const bottomViews = views.filter((v) => v.placement === "bottom");
  const builtIn = mainViews.filter((v) => v.source === "builtin");
  const registered = mainViews.filter((v) => v.source !== "builtin");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    view: ViewEntry;
  } | null>(null);

  const variant = isMobile ? "temporary" : "permanent";
  const open = isMobile ? mobileOpen : true;

  function handleNav(path: string) {
    onNavItemClick?.();
    navigate(path);
    if (isMobile) onMobileClose?.();
  }

  function handleContextMenu(e: React.MouseEvent, view: ViewEntry) {
    if (!view.removable) return;
    e.preventDefault();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, view });
  }

  async function handleHideView() {
    if (!contextMenu || !project) return;
    await api.updateOrchardView(project.id, contextMenu.view.id, { visible: 0 });
    setContextMenu(null);
  }

  async function handleRemoveView() {
    if (!contextMenu || !project) return;
    await api.deleteOrchardView(project.id, contextMenu.view.id);
    setContextMenu(null);
  }

  function renderViewButton(item: ViewEntry) {
    return (
      <Tooltip key={item.id} title={item.label} placement="right">
        <ListItemButton
          data-tour={`tour-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          selected={location.pathname.startsWith(item.path)}
          onClick={() => handleNav(item.path)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          sx={{
            borderRadius: 1,
            minHeight: 44,
            justifyContent: "center",
            px: 1.5,
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
            {resolveIcon(item.icon)}
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onMobileClose}
      sx={{
        width: isMobile ? 0 : WIDTH,
        flexShrink: 0,
        ...(isMobile && { zIndex: (t: any) => t.zIndex.drawer + 2 }),
        "& .MuiDrawer-paper": {
          width: WIDTH,
          boxSizing: "border-box",
          borderRight: 1,
          borderColor: "divider",
          overflowX: "hidden",
        },
      }}
    >
      <Box sx={{ height: 64 }} />
      <Divider />
      <Box sx={{ mt: 1, px: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", flex: 1 }}>
        {loading ? (
          <List disablePadding>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <Skeleton variant="circular" width={28} height={28} />
              </Box>
            ))}
          </List>
        ) : (
          <>
            {/* Built-in views */}
            <List disablePadding>
              {builtIn.map(renderViewButton)}
            </List>

            {registered.length > 0 && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <List disablePadding>
                  {registered.map(renderViewButton)}
                </List>
              </>
            )}

            {/* Add View button */}
            {project && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: "flex", justifyContent: "center", py: 0.5 }}>
                  <Tooltip title="Add View" placement="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate("/settings?tab=views")}
                      sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            )}
          </>
        )}

        <Box sx={{ mt: "auto", pb: 1 }}>
          <Divider sx={{ mb: 1 }} />
          <Tooltip title="Terminal" placement="right">
            <ListItemButton
              data-tour="tour-terminal"
              selected={!!terminalOpen}
              onClick={onTerminalToggle}
              sx={{
                borderRadius: 1,
                minHeight: 44,
                justifyContent: "center",
                px: 1.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                <TerminalIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          {bottomViews.length > 0 && <Divider sx={{ my: 0.5 }} />}
          <Tooltip title="Mesh" placement="right">
            <ListItemButton
              selected={location.pathname === "/mesh"}
              onClick={() => handleNav("/mesh")}
              sx={{
                borderRadius: 1,
                minHeight: 44,
                justifyContent: "center",
                px: 1.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                <HubIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          {bottomViews.map(renderViewButton)}
        </Box>
      </Box>

      {/* Context menu for removable views */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem onClick={handleHideView}>Hide</MenuItem>
        <MenuItem onClick={handleRemoveView}>Remove</MenuItem>
      </Menu>
    </Drawer>
  );
}
