/**
 * Shared project creation and mutation logic.
 * Used by both the chat form system and the CreateNewTab page
 * to avoid duplicating the multi-step create → seed → theme flow.
 */
import { api, type ProjectRecord } from "./api";
import { MOOD_PRESETS } from "../components/onboarding/presets";
import { DEFAULT_BRANDING, type BrandingConfig } from "./branding";

export interface CreateProjectParams {
  name: string;
  description?: string;
  rootPath: string;
  projectType?: string;
  seedPackSlugs?: string[];
  theme?: ThemeSelection;
  branding?: Record<string, string>;
}

export type ThemeSelection =
  | { source: "none" }
  | { source: "preset"; preset: string }
  | { source: "ai"; description?: string }
  | { source: "url"; brandUrl: string; resolvedTheme?: Record<string, unknown> };

export async function createProjectFull(
  params: CreateProjectParams,
): Promise<ProjectRecord> {
  // 1. Create the project record
  const config: Record<string, unknown> = { ides: ["cursor"] };
  if (params.branding) config.branding = params.branding;

  const project = await api.createProject({
    name: params.name,
    description: params.description || "",
    rootPath: params.rootPath,
    projectType: params.projectType || "software",
    goals: [],
    repos: [],
    config,
  });

  // 2. Seed with selected packs
  if (params.seedPackSlugs?.length) {
    await api.seedProject(project.id, params.seedPackSlugs);
  }

  // 3. Apply theme
  if (params.theme) {
    await applyTheme(project.id, project.config, params.theme);
  }

  return project;
}

async function applyTheme(
  projectId: string,
  config: Record<string, unknown> & { theme?: Record<string, unknown> },
  theme: ThemeSelection,
): Promise<void> {
  if (theme.source === "preset") {
    const preset = MOOD_PRESETS.find((p) => p.id === theme.preset);
    if (preset) {
      const { name: _n, subtitle: _s, ...themeFields } = preset.config;
      await api.updateProject(projectId, {
        config: { ...config, theme: themeFields },
      });
    }
  } else if (theme.source === "ai") {
    await api.generateProjectTheme(projectId, theme.description || undefined);
  } else if (theme.source === "url" && theme.resolvedTheme) {
    const merged = { ...DEFAULT_BRANDING, ...theme.resolvedTheme } as BrandingConfig;
    const { name: _n, subtitle: _s, ...themeFields } = merged;
    await api.updateProject(projectId, {
      config: { ...config, theme: themeFields },
    });
  } else if (theme.source === "url" && theme.brandUrl?.trim()) {
    await api.themeFromUrl(projectId, theme.brandUrl.trim());
  }
}

