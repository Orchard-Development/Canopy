import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Skeleton,
  Badge,
  Tabs,
  Tab,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CodeIcon from "@mui/icons-material/Code";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AirIcon from "@mui/icons-material/Air";
import GavelIcon from "@mui/icons-material/Gavel";
import { useProject } from "../hooks/useProject";
import { api } from "../lib/api";
import { PageLayout } from "../components/PageLayout";
import { ProjectDataProvider } from "../contexts/ProjectDataContext";
import { ProjectDashboard } from "../components/project/ProjectDashboard";
import { IntelligenceTab } from "../components/project/IntelligenceTab";
import { PacksTab } from "../components/project/PacksTab";
import { SettingsTab } from "../components/project/SettingsTab";
import { FilesTab } from "../components/project/FilesTab";
import { TAB_KEYS, TAB_LABELS, resolveTab } from "./projectDetailTabs";
import type { TabKey } from "./projectDetailTabs";

const IDE_ICONS: Record<string, React.ReactElement> = {
  "claude-code": <SmartToyIcon fontSize="small" />,
  codex: <CodeIcon fontSize="small" />,
  cursor: <EditNoteIcon fontSize="small" />,
  windsurf: <AirIcon fontSize="small" />,
};

export default function ProjectDetail({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { project, loading, reload } = useProject();
  const [ides, setIdes] = useState<Array<{ name: string }>>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Map old tab names to new ones for backwards compat
  const rawTab = params.get("tab") || "dashboard";
  const resolvedTab = resolveTab(rawTab);
  const tabIndex = TAB_KEYS.indexOf(resolvedTab);

  useEffect(() => { api.listIdes().then(setIdes).catch(() => {}); }, []);

  useEffect(() => {
    if (!project) return;
    api.listApprovals(project.id).then((a) => setPendingApprovals(a.length)).catch(() => {});
  }, [project?.id]);

  async function handleLaunch(ide: string) {
    if (!project) return;
    try {
      const result = await api.launchIde(project.id, ide);
      if (result.method === "session" && result.sessionId) {
        navigate(`/terminal?session=${result.sessionId}&label=${encodeURIComponent(result.label)}`);
      }
    } catch { /* ignore */ }
  }

  if (loading) return <PageLayout title=""><Skeleton variant="rounded" height={200} /></PageLayout>;

  if (!project) return (
    <PageLayout title="Project not found">
      <Typography color="text.secondary" sx={{ mb: 2 }}>This project may have been deleted.</Typography>
      <Button variant="outlined" onClick={() => navigate("/workspace")}>Back to Orchard</Button>
    </PageLayout>
  );

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center">
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

  const tabBar = (
    <Stack direction="row" alignItems="center" sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
      <Tabs
        value={tabIndex}
        onChange={(_, idx) => setParams({ tab: TAB_KEYS[idx] })}
        sx={{ flex: 1 }}
      >
        {TAB_KEYS.map((key) => <Tab key={key} label={TAB_LABELS[key]} />)}
      </Tabs>
      {actions}
    </Stack>
  );

  const tabContent = (
    <ProjectDataProvider projectId={project.id}>
      <>
        {resolvedTab === "dashboard" && (
          <ProjectDashboard project={project} projectId={project.id} onUpdate={reload} />
        )}
        {resolvedTab === "packs" && (
          <PacksTab projectId={project.id} projectName={project.name} />
        )}
        {resolvedTab === "intelligence" && (
          <IntelligenceTab projectId={project.id} />
        )}
        {resolvedTab === "files" && (
          <FilesTab rootPath={project.root_path ?? null} />
        )}
        {resolvedTab === "settings" && (
          <SettingsTab project={project} projectId={project.id} onUpdate={reload} />
        )}
      </>
    </ProjectDataProvider>
  );

  if (embedded) {
    return (
      <>
        {tabBar}
        {tabContent}
      </>
    );
  }

  return (
    <PageLayout title="">
      {tabBar}
      {tabContent}
    </PageLayout>
  );
}

