import { registerForm } from "./registry";
import { ProjectCreateForm } from "../../components/project/ProjectCreateForm";

registerForm({
  type: "create-project",
  title: "Create Project",
  description: "Set up a new AI-configured project in your workspace",
  submitLabel: "Create Project",
  fields: [], // not used -- component takes over
  component: ProjectCreateForm,
  onSubmit: async () => ({ success: false, message: "Unreachable" }),
});
