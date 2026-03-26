import { useActiveProject } from "../hooks/useActiveProject";

/**
 * Returns the cwd from the active project, or undefined if none is set.
 * Terminals use this to default to the active project's root path.
 */
export function useDefaultCwd(): string | undefined {
  const { project } = useActiveProject();
  return project?.root_path;
}
