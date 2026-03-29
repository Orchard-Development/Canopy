import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { useDashboardChannel } from "@/hooks/useDashboardChannel";
import { api, type FeedEvent, type IntelItem, type ResolvedMcpServer, type ApprovalRecord } from "@/lib/api";

interface ProjectData {
  sessions: Array<{ id: string; command: string; label?: string; state?: string; startedAt: string; exitCode?: number; projectId?: string; [k: string]: unknown }>;
  feed: FeedEvent[];
  mcpServers: ResolvedMcpServer[];
  seedStatus: Record<string, unknown>;
  rules: IntelItem[];
  skills: IntelItem[];
  memory: IntelItem[];
  approvals: ApprovalRecord[];
  loading: boolean;
  refresh: () => void;
}

const DEFAULT: ProjectData = {
  sessions: [],
  feed: [],
  mcpServers: [],
  seedStatus: {},
  rules: [],
  skills: [],
  memory: [],
  approvals: [],
  loading: true,
  refresh: () => {},
};

export const ProjectDataContext = createContext<ProjectData>(DEFAULT);

interface Props {
  projectId: string;
  children: ReactNode;
}

export function ProjectDataProvider({ projectId, children }: Props) {
  const [data, setData] = useState(DEFAULT);
  const { channel } = useDashboardChannel();

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    try {
      const [sessions, feed, mcpServers, seedStatus, rules, skills, memory, approvals] =
        await Promise.all([
          api.listTerminals(),
          api.listFeed(projectId, { limit: 50 }),
          api.projectMcpServers(projectId),
          api.getSeedStatus(projectId),
          api.listRules(projectId),
          api.listSkills(projectId),
          api.listMemory(projectId),
          api.listApprovals(projectId).catch(() => [] as ApprovalRecord[]),
        ]);

      setData({
        sessions: sessions.filter((s) => s.projectId === projectId),
        feed,
        mcpServers,
        seedStatus,
        rules,
        skills,
        memory,
        approvals,
        loading: false,
        refresh: fetchAll,
      });
    } catch {
      setData((prev) => ({ ...prev, loading: false, refresh: fetchAll }));
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch on relevant channel events
  useEffect(() => {
    if (!channel) return;

    const events = [
      "session:started", "session:exited", "session:state",
      "feed:new", "mcp:changed", "intel:changed",
    ];

    const refs = events.map((evt) =>
      channel.on(evt, () => fetchAll())
    );

    return () => {
      events.forEach((evt, i) => channel.off(evt, refs[i]));
    };
  }, [channel, fetchAll]);

  return (
    <ProjectDataContext.Provider value={{ ...data, refresh: fetchAll }}>
      {children}
    </ProjectDataContext.Provider>
  );
}
