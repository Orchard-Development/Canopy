export const TAB_KEYS = ["dashboard", "packs", "intelligence", "files", "settings"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const TAB_LABELS: Record<TabKey, string> = {
  dashboard: "Dashboard",
  packs: "Seed Packs",
  intelligence: "Intelligence",
  files: "Files",
  settings: "Settings",
};

/** Map old tab names to current tab names for bookmark/link compat */
export function resolveTab(raw: string): TabKey {
  if (TAB_KEYS.includes(raw as TabKey)) return raw as TabKey;
  const map: Record<string, TabKey> = {
    overview: "dashboard",
    seeds: "packs",
    browser: "files",
    theme: "settings",
    general: "settings",
    secrets: "settings",
    servers: "settings",
    views: "settings",
  };
  return map[raw] ?? "dashboard";
}
