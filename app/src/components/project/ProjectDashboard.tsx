import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  Skeleton,
  IconButton,
  Tooltip,
  List,
  Divider,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import MemoryIcon from "@mui/icons-material/Memory";
import DnsIcon from "@mui/icons-material/Dns";
import SpaIcon from "@mui/icons-material/Spa";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import { api, type ProjectRecord, type FeedEvent } from "../../lib/api";
import { timeAgo } from "../../lib/time";
import { ProjectLogo } from "./ProjectLogo";
import { useProjectData } from "../../hooks/useProjectData";

interface Props {
  project: ProjectRecord;
  projectId: string;
  onUpdate?: () => void;
}

interface TerminalInfo {
  id: string;
  command: string;
  label?: string;
  state?: string;
  startedAt: string;
  exitCode?: number;
  projectId?: string;
}

const STATE_COLOR: Record<string, "success" | "warning" | "info" | "default"> = {
  running: "success",
  waiting: "info",
  idle: "default",
};

const ACTIVITY_COLOR: Record<string, "info" | "success" | "warning" | "default"> = {
  session_analyzed: "info",
  skill_proposed: "warning",
  memory_written: "success",
  pattern_detected: "info",
  approval_resolved: "success",
};

export function ProjectDashboard({ project, projectId, onUpdate }: Props) {
  const navigate = useNavigate();
  const { sessions, feed: events, mcpServers, seedStatus, rules, skills, memory, loading } = useProjectData();

  const seedCount = Object.keys((seedStatus as { packs?: Record<string, unknown> })?.packs || seedStatus || {}).length;
  const intelCount = rules.length + skills.length + memory.length;
  const serverCount = mcpServers.length;

  const config = project.config ?? {};
  const branding = config.branding as { logoUrl?: string; faviconUrl?: string; websiteUrl?: string } | undefined;
  const theme = config.theme as { dark?: { primary?: string; secondary?: string; background?: string }; accentGradient?: string } | undefined;
  const activeSessions = sessions.filter((s) => s.exitCode === undefined);

  if (loading) return <Skeleton variant="rounded" height={300} />;

  return (
    <Stack spacing={2.5}>
      <HeroSection
        project={project}
        projectId={projectId}
        branding={branding}
        theme={theme}
        sessionCount={activeSessions.length}
        onUpdate={onUpdate}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <SessionsStrip sessions={activeSessions} navigate={navigate} />
        <QuickStats
          seedCount={seedCount}
          intelCount={intelCount}
          serverCount={serverCount}
        />
      </Box>

      <ActivityFeed events={events.slice(0, 8)} projectId={projectId} navigate={navigate} />
    </Stack>
  );
}

function HeroSection({ project, projectId, branding, theme, sessionCount, onUpdate }: {
  project: ProjectRecord;
  projectId: string;
  branding?: { logoUrl?: string; faviconUrl?: string; websiteUrl?: string };
  theme?: { dark?: { primary?: string; secondary?: string; background?: string }; accentGradient?: string };
  sessionCount: number;
  onUpdate?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.aiRefreshProject(projectId);
      onUpdate?.();
    } catch { /* ignore */ }
    setRefreshing(false);
  }

  const primary = theme?.dark?.primary;
  const gradient = theme?.accentGradient;

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderColor: primary || "divider",
      }}
    >
      {gradient && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: gradient,
          }}
        />
      )}
      <CardContent sx={{ pt: gradient ? 2.5 : 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <ProjectLogo
            name={project.name}
            logoUrl={branding?.logoUrl}
            faviconUrl={branding?.faviconUrl}
            size={56}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h5" fontWeight={700} noWrap>
                {project.name}
              </Typography>
              {sessionCount > 0 && (
                <Chip
                  label={`${sessionCount} active`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem" }}
                />
              )}
              <Tooltip title="Regenerate description, theme, and logo from project files">
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{ ml: "auto" }}
                >
                  {refreshing ? <CircularProgress size={18} /> : <AutoAwesomeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
            {project.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: 600 }}>
                {project.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {!!(project.config as Record<string, unknown>)?.projectType && (
                <Chip
                  label={String((project.config as Record<string, unknown>).projectType)}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem" }}
                />
              )}
              {branding?.websiteUrl && (
                <Chip
                  icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  label={new URL(branding.websiteUrl).hostname}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem" }}
                  component="a"
                  href={branding.websiteUrl}
                  target="_blank"
                  clickable
                />
              )}
              {primary && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {[theme?.dark?.primary, theme?.dark?.secondary].filter(Boolean).map((c) => (
                    <Box
                      key={c}
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: "3px",
                        bgcolor: c,
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SessionsStrip({ sessions, navigate }: {
  sessions: TerminalInfo[];
  navigate: (path: string) => void;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Sessions</Typography>
          {sessions.length > 0 && (
            <Chip label={sessions.length} size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
          )}
        </Stack>
        {sessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active sessions. Open the project in an IDE to start one.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {sessions.slice(0, 5).map((s) => (
              <Card
                key={s.id}
                variant="outlined"
                sx={{ borderColor: "divider" }}
              >
                <CardActionArea
                  onClick={() => navigate(`/sessions?open=${s.id}`)}
                  sx={{ px: 1.5, py: 0.75 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                      {s.label || s.command}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(s.startedAt)}
                    </Typography>
                    {s.state && (
                      <Chip
                        label={s.state}
                        size="small"
                        color={STATE_COLOR[s.state] ?? "default"}
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.65rem" }}
                      />
                    )}
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function QuickStats({ seedCount, intelCount, serverCount }: {
  seedCount: number | null;
  intelCount: number | null;
  serverCount: number | null;
}) {
  const stats = [
    { label: "Intelligence files", value: intelCount, icon: <MemoryIcon fontSize="small" /> },
    { label: "Seed packs", value: seedCount, icon: <SpaIcon fontSize="small" /> },
    { label: "MCP servers", value: serverCount, icon: <DnsIcon fontSize="small" /> },
  ];

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Quick Stats
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {stats.map((s) => (
            <Stack key={s.label} direction="row" spacing={1} alignItems="center">
              <Box sx={{ color: "text.secondary", display: "flex" }}>{s.icon}</Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1}>
                  {s.value ?? "--"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}


function ActivityFeed({ events, projectId, navigate }: {
  events: FeedEvent[];
  projectId: string;
  navigate: (path: string) => void;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Recent Activity
        </Typography>
        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No activity yet.
          </Typography>
        ) : (
          <>
            <List dense disablePadding>
              {events.map((e, i) => (
                <Box key={e.id}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 6, color: "primary.main", flexShrink: 0 }} />
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {e.title}
                    </Typography>
                    <Chip
                      label={e.type.replace(/_/g, " ")}
                      size="small"
                      color={ACTIVITY_COLOR[e.type] ?? "default"}
                      variant="outlined"
                      sx={{ height: 18, fontSize: "0.6rem", flexShrink: 0 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 45, textAlign: "right" }}>
                      {timeAgo(e.created_at)}
                    </Typography>
                  </Stack>
                  {i < events.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: "pointer", mt: 1, display: "block" }}
              onClick={() => navigate(`/projects/${projectId}/feed`)}
            >
              View all activity
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
