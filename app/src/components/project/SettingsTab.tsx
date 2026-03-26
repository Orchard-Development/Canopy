import { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import SettingsIcon from "@mui/icons-material/Settings";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import DnsIcon from "@mui/icons-material/Dns";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import BuildIcon from "@mui/icons-material/Build";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ProjectThemeCard } from "./ProjectThemeCard";
import { GeneralCard } from "./GeneralCard";
import { SecretsCard } from "../settings/SecretsCard";
import { McpServersCard } from "./McpServersCard";
import { ViewsCard } from "./ViewsCard";
import { MaintenanceCard } from "./MaintenanceCard";
import type { ProjectRecord } from "../../lib/api";

interface Props {
  project: ProjectRecord;
  projectId: string;
  onUpdate: () => void;
}

interface SectionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  content: React.ReactNode;
}

export function SettingsTab({ project, projectId, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<string | false>("appearance");

  const handleChange = (panel: string) => (_: unknown, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const sections: SectionDef[] = [
    {
      id: "appearance",
      label: "Appearance",
      icon: <PaletteIcon fontSize="small" />,
      content: <ProjectThemeCard project={project} onUpdate={onUpdate} />,
    },
    {
      id: "general",
      label: "General",
      icon: <SettingsIcon fontSize="small" />,
      content: <GeneralCard project={project} onUpdate={onUpdate} />,
    },
    {
      id: "secrets",
      label: "Secrets & API Keys",
      icon: <VpnKeyIcon fontSize="small" />,
      content: <SecretsCard />,
    },
    {
      id: "servers",
      label: "MCP Servers",
      icon: <DnsIcon fontSize="small" />,
      content: <McpServersCard projectId={projectId} />,
    },
    {
      id: "views",
      label: "Sidebar Views",
      icon: <ViewQuiltIcon fontSize="small" />,
      content: <ViewsCard />,
    },
    {
      id: "maintenance",
      label: "Maintenance",
      icon: <BuildIcon fontSize="small" />,
      content: <MaintenanceCard projectId={projectId} />,
    },
  ];

  return (
    <Stack spacing={0}>
      {sections.map((s) => (
        <Accordion
          key={s.id}
          expanded={expanded === s.id}
          onChange={handleChange(s.id)}
          disableGutters
          variant="outlined"
          sx={{
            "&::before": { display: "none" },
            "&:not(:last-child)": { borderBottom: 0 },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ color: "text.secondary", display: "flex" }}>{s.icon}</Box>
              <Typography variant="subtitle2">{s.label}</Typography>
              {s.badge && (
                <Chip label={s.badge} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {s.content}
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
