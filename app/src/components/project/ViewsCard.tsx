import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Switch,
} from "@mui/material";
import ParkIcon from "@mui/icons-material/Park";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DevicesIcon from "@mui/icons-material/Devices";
import ExtensionIcon from "@mui/icons-material/Extension";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import DescriptionIcon from "@mui/icons-material/Description";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import WidgetsIcon from "@mui/icons-material/Widgets";
import SettingsIcon from "@mui/icons-material/Settings";
import ShieldIcon from "@mui/icons-material/Shield";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import TerminalIcon from "@mui/icons-material/Terminal";
import HistoryIcon from "@mui/icons-material/History";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HubIcon from "@mui/icons-material/Hub";
import { useViewRegistry } from "../../hooks/useViewRegistry";

const VIEW_ICON_MAP: Record<string, React.ReactNode> = {
  Park: <ParkIcon fontSize="small" />,
  ChatBubbleOutline: <ChatBubbleOutlineIcon fontSize="small" />,
  Devices: <DevicesIcon fontSize="small" />,
  Extension: <ExtensionIcon fontSize="small" />,
  Lightbulb: <LightbulbIcon fontSize="small" />,
  Description: <DescriptionIcon fontSize="small" />,
  Analytics: <AnalyticsIcon fontSize="small" />,
  Widgets: <WidgetsIcon fontSize="small" />,
  Settings: <SettingsIcon fontSize="small" />,
  Shield: <ShieldIcon fontSize="small" />,
  RocketLaunch: <RocketLaunchIcon fontSize="small" />,
  Terminal: <TerminalIcon fontSize="small" />,
  History: <HistoryIcon fontSize="small" />,
  AccountTree: <AccountTreeIcon fontSize="small" />,
  Hub: <HubIcon fontSize="small" />,
};

const REQUIRED_VIEW_IDS = new Set(["default-orchard", "default-chat", "default-settings"]);

export function ViewsCard() {
  const { views, allViews, setHidden } = useViewRegistry();
  const visibleIds = new Set(views.map((v) => v.id));

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          Views
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Toggle which views appear in the sidebar.
        </Typography>
        <List dense disablePadding>
          {allViews.map((v) => {
            const isRequired = REQUIRED_VIEW_IDS.has(v.id);
            const isVisible = visibleIds.has(v.id);
            return (
              <ListItem key={v.id} disablePadding sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {VIEW_ICON_MAP[v.icon] ?? <ExtensionIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={v.label}
                  primaryTypographyProps={{
                    variant: "body2",
                    sx: { opacity: isVisible ? 1 : 0.4 },
                  }}
                />
                {isRequired ? (
                  <Chip label="Required" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                ) : (
                  <Switch
                    edge="end"
                    size="small"
                    checked={isVisible}
                    onChange={() => setHidden(v.id, isVisible)}
                  />
                )}
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
