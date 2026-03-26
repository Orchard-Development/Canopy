import { api } from "../api";
import { registerForm } from "./registry";
import type { FormSubmitResult } from "../../types/forms";

registerForm({
  type: "create-proposal",
  title: "Create Proposal",
  description: "Dispatch an agent to write a design proposal",
  submitLabel: "Create Proposal",
  fields: [
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
      placeholder: "What should this proposal cover? Describe the problem, goals, and scope...",
    },
    {
      name: "projectId",
      label: "Project ID",
      type: "text",
      hidden: true,
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      const result = await api.createProposal(
        v.description,
        undefined,
        v.projectId || undefined,
      );
      return {
        success: true,
        message: `Proposal agent dispatched (session: ${result.sessionId.slice(0, 8)}...)`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

registerForm({
  type: "update-proposal-status",
  title: "Update Proposal Status",
  submitLabel: "Update Status",
  fields: [
    { name: "slug", label: "Proposal Slug", type: "text", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Complete", value: "complete" },
        { label: "Abandoned", value: "abandoned" },
      ],
    },
    { name: "projectId", label: "Project ID", type: "text", hidden: true },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await api.setProposalStatus(v.slug, v.status, v.projectId || undefined);
      return {
        success: true,
        message: `Proposal "${v.slug}" status set to ${v.status}`,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

registerForm({
  type: "build-proposal",
  title: "Build Proposal",
  description: "Dispatch an agent to implement a proposal",
  submitLabel: "Build",
  fields: [
    { name: "slug", label: "Proposal Slug", type: "text", required: true },
    {
      name: "task",
      label: "Task Number",
      type: "text",
      placeholder: "Optional -- builds whole proposal if empty",
    },
    {
      name: "agent",
      label: "Agent",
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
      const result = await api.buildProposal(v.slug, {
        task: v.task || undefined,
        agent: v.agent || undefined,
        projectId: v.projectId || undefined,
      });
      return {
        success: true,
        message: `Build agent dispatched for "${v.slug}" (session: ${result.sessionId.slice(0, 8)}...)`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

registerForm({
  type: "update-task-status",
  title: "Update Task Status",
  submitLabel: "Update",
  fields: [
    { name: "slug", label: "Proposal Slug", type: "text", required: true },
    { name: "taskNum", label: "Task Number", type: "text", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "Pending", value: "pending" },
        { label: "In Progress", value: "in-progress" },
        { label: "Complete", value: "complete" },
        { label: "Skipped", value: "skipped" },
      ],
    },
    { name: "projectId", label: "Project ID", type: "text", hidden: true },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await api.updateTaskStatus(
        v.slug,
        v.taskNum,
        v.status,
        v.projectId || undefined,
      );
      return {
        success: true,
        message: `Task ${v.taskNum} in "${v.slug}" set to ${v.status}`,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

registerForm({
  type: "delete-proposal",
  title: "Delete Proposal",
  description: "Permanently delete this proposal and its files",
  submitLabel: "Delete Proposal",
  danger: true,
  fields: [
    { name: "slug", label: "Proposal Slug", type: "text", required: true },
    { name: "projectId", label: "Project ID", type: "text", hidden: true },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await api.deleteProposal(v.slug, v.projectId || undefined);
      return { success: true, message: `Proposal "${v.slug}" deleted` };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Operation failed";
}
