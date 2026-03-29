import { useContext } from "react";
import { ProjectDataContext } from "@/contexts/ProjectDataContext";

/**
 * Consume centralized project data. Must be inside <ProjectDataProvider>.
 */
export function useProjectData() {
  return useContext(ProjectDataContext);
}
