import { registerForm } from "./registry";
import type { FormSubmitResult } from "../../types/forms";

registerForm({
  type: "update-setting",
  title: "Update Setting",
  submitLabel: "Save",
  fields: [
    {
      name: "key",
      label: "Setting Key",
      type: "text",
      required: true,
      placeholder: "setting.key.name",
    },
    {
      name: "value",
      label: "Value",
      type: "text",
      required: true,
      placeholder: "New value",
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [v.key]: v.value }),
      });
      return {
        success: true,
        message: `Setting "${v.key}" updated`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Failed to update setting",
      };
    }
  },
});
