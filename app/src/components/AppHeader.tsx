import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Avatar,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import { useColorMode } from "../hooks/useColorMode";
import { useBranding, resolveAccent } from "../lib/branding";
import { useIdentity } from "../hooks/useIdentity";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { Breadcrumbs } from "./Breadcrumbs";
import { TeamSwitcher } from "./TeamSwitcher";
import { NotificationBell } from "./NotificationBell";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface AppHeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  onFocusSession?: (sessionId: string, label: string) => void;
  onViewProposal?: (slug: string) => void;
}

export function AppHeader({ onMenuToggle, showMenuButton, onFocusSession, onViewProposal }: AppHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { mode, toggle: toggleColorMode } = useColorMode();
  const branding = useBranding();
  const identity = useIdentity();
  const accentColor = resolveAccent(branding, mode);

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        zIndex: (t: any) => t.zIndex.drawer + 1,
        WebkitAppRegion: "drag",
      } as any}
    >
      <Toolbar sx={{ minHeight: 64, gap: isMobile ? 0.5 : 1.25, px: isMobile ? 1 : 2, WebkitAppRegion: "drag" } as any}>
        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0.5 : 1.25, WebkitAppRegion: "no-drag" } as any}>
          {showMenuButton && (
            <IconButton onClick={onMenuToggle} edge="start" size="small" sx={{ mr: 0.5 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Avatar
            variant="rounded"
            src={mode === "dark" ? "/logo-dark.png" : "/logo-light.png"}
            sx={{
              width: 30,
              height: 30,
              "& img": { width: "100%", height: "100%", objectFit: "cover" },
            }}
          />
          <ProjectSwitcher />
          <TeamSwitcher />
          <Breadcrumbs />
        </Box>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0.5 : 1, WebkitAppRegion: "no-drag" } as any}>
          {identity && (
            <Tooltip title={identity.displayName}>
              <Avatar
                src={identity.avatarBase64 || identity.avatarUrl || undefined}
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: (identity.avatarBase64 || identity.avatarUrl) ? "transparent" : accentColor,
                  color: "common.white",
                }}
              >
                {!(identity.avatarBase64 || identity.avatarUrl) && getInitials(identity.displayName)}
              </Avatar>
            </Tooltip>
          )}

          <NotificationBell onFocusSession={onFocusSession} onViewProposal={onViewProposal} />

          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton onClick={toggleColorMode} size="small">
              {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {window.orchard?.windowClose && (
            <Box sx={{ display: "flex", gap: 0.25, ml: 0.5, borderLeft: 1, borderColor: "divider", pl: 1 }}>
              <IconButton onClick={() => window.orchard.windowMinimize?.()} size="small" sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
                <RemoveIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton onClick={() => window.orchard.windowMaximize?.()} size="small" sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
                <CropSquareIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <IconButton onClick={() => window.orchard.windowClose?.()} size="small" sx={{ opacity: 0.5, "&:hover": { opacity: 1, color: "error.main" } }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
