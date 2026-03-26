import { useEffect, useRef, useMemo } from "react";
import { useActiveProject } from "../hooks/useActiveProject";
import { useBranding, useSetBranding, type BrandingConfig } from "../lib/branding";

/**
 * Watches the active project and swaps in its theme when present.
 * Restores the global (workspace) branding when the project has no theme or is cleared.
 * Must be rendered inside both ActiveProjectProvider and BrandingContext.
 */
export function ProjectThemeBridge() {
  const { project } = useActiveProject();
  const branding = useBranding();
  const setBranding = useSetBranding();
  const globalBrandingRef = useRef<BrandingConfig | null>(null);
  const activeThemeProjectId = useRef<string | null>(null);

  // Stable serialization so the effect fires when the theme object contents change
  const themeJson = useMemo(
    () => (project?.config?.theme ? JSON.stringify(project.config.theme) : null),
    [project?.config?.theme],
  );

  useEffect(() => {
    const theme = themeJson ? (JSON.parse(themeJson) as Partial<BrandingConfig>) : undefined;

    if (project && theme && Object.keys(theme).length > 0) {
      // Save global branding before overriding (only once per project switch)
      if (activeThemeProjectId.current !== project.id) {
        if (!activeThemeProjectId.current) {
          globalBrandingRef.current = branding;
        }
        activeThemeProjectId.current = project.id;
      }
      const merged: BrandingConfig = {
        ...(globalBrandingRef.current ?? branding),
        ...theme,
        name: (globalBrandingRef.current ?? branding).name,
        subtitle: (globalBrandingRef.current ?? branding).subtitle,
        dark: { ...(globalBrandingRef.current ?? branding).dark, ...(theme.dark ?? {}) },
        light: { ...(globalBrandingRef.current ?? branding).light, ...(theme.light ?? {}) },
      };
      setBranding(merged);
    } else if (activeThemeProjectId.current) {
      // Restore global branding
      activeThemeProjectId.current = null;
      if (globalBrandingRef.current) {
        setBranding(globalBrandingRef.current);
        globalBrandingRef.current = null;
      }
    }
  }, [project?.id, themeJson]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
