import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type ProjectRecord } from "../lib/api";
import { fetchSettings } from "../lib/settingsCache";

interface ActiveProjectValue {
  project: ProjectRecord | null;
  loading: boolean;
  activate: (project: ProjectRecord) => void;
  clear: () => void;
  refresh: () => void;
}

const ActiveProjectContext = createContext<ActiveProjectValue>({
  project: null,
  loading: true,
  activate: () => {},
  clear: () => {},
  refresh: () => {},
});

function persistActiveProject(projectId: string | null): void {
  const body: Record<string, string> = {};
  body["active_project"] = projectId ?? "";
  body["default_terminal_project"] = projectId ?? "";
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then(async (settings: Record<string, string>) => {
        const id = settings.active_project || settings.default_terminal_project;
        if (cancelled) return;
        let p: ProjectRecord | null = null;
        if (id) {
          p = await api.getProject(id).catch(() => null);
        }
        // No persisted project (or it was deleted) — auto-select the first available one
        if (!p) {
          const all = await api.listProjects().catch(() => [] as ProjectRecord[]);
          if (!cancelled && all.length > 0) {
            p = all[0];
            persistActiveProject(p.id);
          }
        }
        if (!cancelled) setProject(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const activate = useCallback((p: ProjectRecord) => {
    setProject(p);
    persistActiveProject(p.id);
  }, []);

  const clear = useCallback(() => {
    setProject(null);
    persistActiveProject(null);
  }, []);

  const refresh = useCallback(() => {
    if (!project) return;
    api.getProject(project.id).then((p) => { if (p) setProject(p); }).catch(() => {});
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ActiveProjectContext.Provider value={{ project, loading, activate, clear, refresh }}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject(): ActiveProjectValue {
  return useContext(ActiveProjectContext);
}
