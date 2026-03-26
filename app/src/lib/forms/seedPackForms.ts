import { api } from "../api";
import { registerForm } from "./registry";
import type { FormSubmitResult } from "../../types/forms";

// --- Create Seed Pack (3 methods: manual, AI generate, GitHub harvest) ---

registerForm({
  type: "create-seed-pack",
  title: "Create Seed Pack",
  description: "Create a new seed pack with rules and skills",
  submitLabel: "Create",
  fields: [
    {
      name: "method",
      label: "Creation Method",
      type: "chip-select",
      defaultValue: "manual",
      options: [
        { label: "Manual", value: "manual" },
        { label: "AI Generate", value: "ai" },
        { label: "From GitHub", value: "github" },
      ],
    },
    // -- Manual fields --
    {
      name: "name",
      label: "Name",
      type: "text",
      required: true,
      placeholder: "my-seed-pack",
      showWhen: { field: "method", value: "manual" },
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "What does this seed pack provide?",
      showWhen: { field: "method", value: ["manual", "github"] },
    },
    // -- AI Generate fields --
    {
      name: "prompt",
      label: "What should this pack do?",
      type: "textarea",
      required: true,
      placeholder:
        "e.g. A Python data science pack with rules for notebook hygiene, pandas best practices, and a skill for generating EDA reports",
      helperText:
        "The AI will study all shipped packs to match their format, then generate a complete pack with rules and skills",
      showWhen: { field: "method", value: "ai" },
    },
    // -- GitHub harvest fields --
    {
      name: "githubUrl",
      label: "GitHub URL",
      type: "text",
      required: true,
      placeholder: "https://github.com/owner/repo or owner/repo",
      showWhen: { field: "method", value: "github" },
    },
    {
      name: "githubName",
      label: "Pack Name (optional)",
      type: "text",
      placeholder: "Auto-generated from repo name",
      showWhen: { field: "method", value: "github" },
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      if (v.method === "ai") {
        const result = await api.generateSeedPack({ prompt: v.prompt });
        return {
          success: true,
          message: `AI generated "${result.name}" with ${result.fileCount} files`,
          data: result as unknown as Record<string, unknown>,
        };
      }
      if (v.method === "github") {
        const result = await api.harvestGithub({
          url: v.githubUrl,
          name: v.githubName || undefined,
          description: v.description || undefined,
        });
        return {
          success: true,
          message: `Harvested "${result.name}" -- ${result.fileCount} files from ${result.scannedFiles} scanned`,
          data: result as unknown as Record<string, unknown>,
        };
      }
      // Manual
      const result = await api.createSeedPack({
        name: v.name,
        description: v.description || undefined,
      });
      return {
        success: true,
        message: `Seed pack "${result.name}" created`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

// --- Update Seed Pack ---

registerForm({
  type: "update-seed-pack",
  title: "Update Seed Pack",
  submitLabel: "Save Changes",
  fields: [
    { name: "id", label: "ID", type: "text", required: true, hidden: true },
    { name: "name", label: "Name", type: "text", placeholder: "Seed pack name" },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Seed pack description",
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      const body: Record<string, string> = {};
      if (v.name) body.name = v.name;
      if (v.description) body.description = v.description;
      const result = await api.updateSeedPack(v.id, body);
      return {
        success: true,
        message: `Seed pack "${result.name}" updated`,
        data: result as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

// --- Delete Seed Pack ---

registerForm({
  type: "delete-seed-pack",
  title: "Delete Seed Pack",
  description: "Permanently remove this seed pack",
  submitLabel: "Delete",
  danger: true,
  fields: [
    { name: "id", label: "ID", type: "text", required: true, hidden: true },
    {
      name: "name",
      label: "Seed Pack Name",
      type: "text",
      helperText: "Confirm the seed pack to delete",
    },
  ],
  onSubmit: async (v): Promise<FormSubmitResult> => {
    try {
      await api.deleteSeedPack(v.id);
      return { success: true, message: "Seed pack deleted" };
    } catch (err) {
      return { success: false, message: errMsg(err) };
    }
  },
});

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Operation failed";
}
