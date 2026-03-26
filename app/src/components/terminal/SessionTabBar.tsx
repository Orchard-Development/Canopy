import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import LanguageIcon from "@mui/icons-material/Language";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import type { SessionTab } from "../../views/Sessions";

function tabLabel(tab: SessionTab): string {
  if (tab.type === "web") return tab.title || tab.url;
  return `${tab.username}@${tab.hostname}`;
}

interface Props {
  tabs: SessionTab[];
  activeTab: number;
  onChangeTab: (i: number) => void;
  onCloseTab: (i: number) => void;
  onNew: () => void;
}

export function SessionTabBar({ tabs, activeTab, onChangeTab, onCloseTab, onNew }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => onChangeTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          flex: 1, minHeight: 36,
          "& .MuiTabs-indicator": { display: "none" },
          "& .MuiTab-root": { minHeight: 28, minWidth: 0, py: 0, px: 0, mr: 0.5, my: 0.5 },
        }}
      >
        {tabs.map((tab, i) => {
          const isActive = i === activeTab;
          const label = tabLabel(tab);
          return (
            <Tab
              key={tab.id}
              sx={(t) => ({
                bgcolor: isActive ? alpha(t.palette.primary.main, 0.18) : "transparent",
                borderRadius: 1, overflow: "visible",
                transition: "all 0.15s",
                opacity: isActive ? 1 : 0.6,
                border: isActive
                  ? `1.5px solid ${alpha(t.palette.primary.main, 0.5)}`
                  : "1.5px solid transparent",
                boxShadow: isActive
                  ? `0 0 8px ${alpha(t.palette.primary.main, 0.35)}`
                  : "none",
                "&:hover": { bgcolor: isActive ? alpha(t.palette.primary.main, 0.28) : "action.hover", opacity: 1 },
                "&:hover .tab-close": { opacity: 1 },
              })}
              label={
                <Tooltip title={label} enterDelay={400}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, position: "relative" }}>
                    {tab.type === "web" ? <LanguageIcon sx={{ fontSize: 14 }} /> : <DesktopWindowsIcon sx={{ fontSize: 14 }} />}
                    <Typography variant="caption" noWrap sx={{ maxWidth: 160, lineHeight: 1, fontWeight: isActive ? 600 : 400 }}>
                      {label}
                    </Typography>
                    <IconButton
                      className="tab-close"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onCloseTab(i); }}
                      sx={{ p: 0.25, opacity: 0, position: "absolute", right: -6, top: -6, transition: "opacity 0.15s", bgcolor: "background.paper", borderRadius: "50%", zIndex: 1 }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Tooltip>
              }
            />
          );
        })}
      </Tabs>
      <IconButton onClick={onNew} sx={{ mr: 1 }}>
        <AddIcon />
      </IconButton>
    </Box>
  );
}
