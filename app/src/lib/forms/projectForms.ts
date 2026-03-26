import { api } from "../api";
import { registerForm } from "./registry";
import type { FormSubmitResult } from "../../types/forms";

registerForm({
  type: "import-project",
  title: "Import Existing Project",
  description: "Import an existing directory as a project",
  submitLabel: "Import",
  fields: [
    {
      name: "rootPath",
      label: "Root Path",
      type: "path",
      required: true,
      placeholder: "/Users/you/projects/my-project",
      helperText: "Absolute path to the existing project directory",
    },
    {
      name: "name",
      label: "Project Name",
      type: "text",
      placeholder: "Defaults to directory name if empty",
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      const result = await api.importProject(v.rootPath, v.name || undefined);
      return {
        success: true,
        message: `Imported "${result.name}" from ${v.rootPath}`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

registerForm({
  type: "update-project",
  title: "Update Project",
  description: "Modify project name, description, path, or status",
  submitLabel: "Save Changes",
  fields: [
    { name: "id", label: "ID", type: "text", required: true, hidden: true },
    { name: "name", label: "Name", type: "text", placeholder: "Project name" },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Project description",
    },
    {
      name: "root_path",
      label: "Root Path",
      type: "dir-picker",
      placeholder: "/absolute/path/to/project",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
      ],
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      const body: Record<string, string> = {};
      if (v.name) body.name = v.name;
      if (v.description) body.description = v.description;
      if (v.root_path) body.root_path = v.root_path;
      if (v.status) body.status = v.status;
      const result = await api.updateProject(v.id, body);
      return {
        success: true,
        message: `Project "${result.name}" updated`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

registerForm({
  type: "delete-project",
  title: "Delete Project",
  description:
    "Remove this project from the workspace. Files on disk are kept.",
  submitLabel: "Delete Project",
  danger: true,
  fields: [
    { name: "id", label: "ID", type: "text", required: true, hidden: true },
    {
      name: "name",
      label: "Project Name",
      type: "text",
      helperText: "Confirm by viewing the project name above",
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await api.deleteProject(v.id);
      return { success: true, message: `Project deleted (files kept on disk)` };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Operation failed";
}
