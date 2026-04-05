import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDashboardChannel } from "@/hooks/useDashboardChannel";
import { api, type FeedEvent, type IntelItem, type ResolvedMcpServer, type ApprovalRecord } from "@/lib/api";

export interface SeedPackInfo {
  id: string;
  slug: string;
  name: string;
  source: string;
  auto_apply?: boolean;
  fileCount: number;
  version: number;
}

interface ProjectData {
  sessions: Array<{ id: string; command: string; label?: string; state?: string; startedAt: string; exitCode?: number; projectId?: string; [k: string]: unknown }>;
  feed: FeedEvent[];
  mcpServers: ResolvedMcpServer[];
  seedStatus: Record<string, unknown>;
  packList: SeedPackInfo[];
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
  packList: [],
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
  const activeRef = useRef(true);

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    try {
      const [sessions, feed, mcpServers, seedStatus, packList, rules, skills, memory, approvals] =
        await Promise.all([
          api.listTerminals(),
          api.listFeed(projectId, { limit: 50 }),
          api.projectMcpServers(projectId),
          api.getSeedStatus(projectId),
          api.listSeedPacks(),
          api.listRules(projectId),
          api.listSkills(projectId),
          api.listMemory(projectId),
          api.listApprovals(projectId).catch(() => [] as ApprovalRecord[]),
        ]);

      // Guard against StrictMode unmount: don't setState after cleanup
      if (!activeRef.current) return;

      setData({
        sessions: sessions.filter((s) => s.projectId === projectId),
        feed,
        mcpServers,
        seedStatus,
        packList,
        rules,
        skills,
        memory,
        approvals,
        loading: false,
        refresh: fetchAll,
      });
    } catch {
      if (!activeRef.current) return;
      setData((prev) => ({ ...prev, loading: false, refresh: fetchAll }));
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    activeRef.current = true;
    fetchAll();
    return () => { activeRef.current = false; };
  }, [fetchAll]);

  // Refetch on relevant channel events.
  // Use actual engine event names from events.ts — only the events that
  // materially change project dashboard data.
  useEffect(() => {
    if (!channel) return;

    const refetchEvents = [
      "session:started",  // new session appeared
      "session:exited",   // session ended
      "session:state",    // session state changed (running/waiting/idle)
      "feed:event",       // new feed entry (EVENTS.feed)
    ];

    const refs = refetchEvents.map((evt) =>
      channel.on(evt, () => fetchAll())
    );

    return () => {
      refetchEvents.forEach((evt, i) => channel.off(evt, refs[i]));
    };
  }, [channel, fetchAll]);

  return (
    <ProjectDataContext.Provider value={{ ...data, refresh: fetchAll }}>
      {children}
    </ProjectDataContext.Provider>
  );
}
