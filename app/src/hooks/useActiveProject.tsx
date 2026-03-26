import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type ProjectRecord } from "../lib/api";

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
    fetch("/api/settings")
      .then((r) => r.json())
      .then(async (settings: Record<string, string>) => {
        const id = settings.active_project || settings.default_terminal_project;
        if (cancelled || !id) { setLoading(false); return; }
        const p = await api.getProject(id).catch(() => null);
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
