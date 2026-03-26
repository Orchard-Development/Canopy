import { api } from "../api";
import { registerForm } from "./registry";
import type { FormSubmitResult } from "../../types/forms";

registerForm({
  type: "dispatch-agent",
  title: "Dispatch Agent",
  description: "Spawn a terminal agent to work on a task",
  submitLabel: "Dispatch",
  fields: [
    {
      name: "prompt",
      label: "Task Description",
      type: "textarea",
      required: true,
      placeholder: "What should the agent do?",
    },
    {
      name: "agent",
      label: "Agent Type",
      type: "select",
      defaultValue: "claude",
      options: [
        { label: "Claude", value: "claude" },
        { label: "Codex", value: "codex" },
      ],
    },
    { name: "projectId", label: "Project ID", type: "text", hidden: true },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      const result = await api.dispatch(
        v.prompt,
        v.agent || undefined,
      );
      return {
        success: true,
        message: `Agent dispatched: ${result.command} (${v.prompt.slice(0, 40)}...)`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

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
