import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";
import { api, type ProjectRecord } from "../lib/api";
import { useActiveProject } from "./useActiveProject";

interface ProjectContextValue {
  project: ProjectRecord | null;
  loading: boolean;
  reload: () => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  project: null,
  loading: true,
  reload: () => {},
});

export function ProjectProvider({ children, projectId: propId }: { children: ReactNode; projectId?: string }) {
  const { projectId: paramId } = useParams<{ projectId: string }>();
  const projectId = propId || paramId;
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { project: activeProject, activate } = useActiveProject();

  function load() {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getProject(projectId)
      .then((p) => {
        setProject(p);
        // Auto-sync the global active project so dispatch, terminal drawer,
        // and other consumers of useActiveProject() stay in sync with the
        // URL-based project.
        if (p && p.id !== activeProject?.id) {
          activate(p);
        }
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProjectContext.Provider value={{ project, loading, reload: load }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  return useContext(ProjectContext);
}
