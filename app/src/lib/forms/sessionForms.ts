import { api } from "../api";
import { registerForm } from "./registry";
import type { FormSubmitResult } from "../../types/forms";

registerForm({
  type: "set-session-label",
  title: "Label Session",
  submitLabel: "Set Label",
  fields: [
    { name: "id", label: "Session ID", type: "text", required: true },
    {
      name: "label",
      label: "Label",
      type: "text",
      required: true,
      placeholder: "A short description of this session",
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await api.renameTerminal(v.id, v.label);
      return {
        success: true,
        message: `Session labeled: "${v.label}"`,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Operation failed";
}
