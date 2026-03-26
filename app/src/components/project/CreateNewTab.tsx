import { useNavigate } from "react-router-dom";
import { useActiveProject } from "../../hooks/useActiveProject";
import { ProjectCreateForm } from "./ProjectCreateForm";
import type { FormSubmitResult } from "../../types/forms";
import type { ProjectRecord } from "../../lib/api";

export function CreateNewTab() {
  const navigate = useNavigate();
  const { activate } = useActiveProject();

  function handleCreated(result: FormSubmitResult) {
    if (result.success && result.data) {
      const project = result.data as unknown as ProjectRecord;
      activate(project);
      navigate(`/projects/${project.id}`);
    }
  }

  return <ProjectCreateForm onSubmitted={handleCreated} />;
}
