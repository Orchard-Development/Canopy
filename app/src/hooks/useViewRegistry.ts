import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore, lazy, useRef } from "react";
import { fetchSettings } from "../lib/settingsCache";
import type { ComponentType, LazyExoticComponent } from "react";
import { useActiveProject } from "./useActiveProject";
import { useRefetchOnDashboardEvent } from "./useRefetchOnDashboardEvent";
import { EVENTS } from "../lib/events";
import { api } from "../lib/api";
import type { OrchardViewRecord } from "../lib/api";
import { COMPONENT_MAP } from "../views/registry";

export interface ViewEntry {
  id: string;
  path: string;
  label: string;
  icon: string;
  component: LazyExoticComponent<ComponentType>;
  source: string;
  sourceId: string | null;
  position: number;
  removable: boolean;
  visible: boolean;
  placement: "main" | "bottom";
}

function resolveComponent(componentStr: string): LazyExoticComponent<ComponentType> {
  if (componentStr.startsWith("bundled:")) {
    const mapped = COMPONENT_MAP[componentStr];
    if (mapped) return mapped;
  }

  if (componentStr.startsWith("capability:")) {
    const parts = componentStr.slice("capability:".length).split(":");
    const capName = parts[0];
    const chunk = parts.slice(1).join(":");
    return lazy(() =>
      import("../views/CapabilityViewHost").then((m) => ({
        default: () => m.default({ capName, chunk }),
      })),
    );
  }

  if (componentStr.startsWith("iframe:")) {
    const url = componentStr.slice("iframe:".length);
    return lazy(() =>
      import("../views/IframeViewHost").then((m) => ({
        default: () => m.default({ url, title: "External" }),
      })),
    );
  }

  return lazy(() =>
    Promise.resolve({
      default: () => React.createElement("div", null, `Unknown view: ${componentStr}`),
    }),
  );
}

function rowToEntry(row: OrchardViewRecord): ViewEntry {
  return {
    id: row.id,
    path: row.route_path,
    label: row.label,
    icon: row.icon,
    component: resolveComponent(row.component),
    source: row.source,
    sourceId: row.source_id,
    position: row.position,
    removable: !!row.removable,
    visible: !!row.visible,
    placement: "main",
  };
}

// Hardcoded defaults -- always present regardless of DB state.
export const DEFAULT_VIEWS: ViewEntry[] = [
  {
    id: "default-orchard",
    path: "/workspace",
    label: "Orchard",
    icon: "Park",
    component: lazy(() => import("../views/Orchard")),
    source: "builtin",
    sourceId: null,
    position: 0,
    removable: false,
    visible: true,
    placement: "main",
  },
  {
    id: "default-chat",
    path: "/ai",
    label: "Chat",
    icon: "ChatBubbleOutline",
    component: COMPONENT_MAP["bundled:Chat"],
    source: "builtin",
    sourceId: null,
    position: 5,
    removable: false,
    visible: true,
    placement: "main",
  },
  {
    id: "default-proposals",
    path: "/proposals",
    label: "Proposals",
    icon: "Description",
    component: COMPONENT_MAP["bundled:Proposals"],
    source: "default",
    sourceId: null,
    position: 55,
    removable: true,
    visible: true,
    placement: "main",
  },
  {
    id: "default-sessions",
    path: "/sessions",
    label: "Sessions",
    icon: "History",
    component: COMPONENT_MAP["bundled:ProjectSessions"],
    source: "default",
    sourceId: null,
    position: 45,
    removable: true,
    visible: true,
    placement: "main",
  },
  {
    id: "default-roots-view",
    path: "/roots",
    label: "Roots",
    icon: "AccountTree",
    component: COMPONENT_MAP["bundled:RootsView"],
    source: "default",
    sourceId: null,
    position: 10,
    removable: true,
    visible: true,
    placement: "bottom",
  },
  {
    id: "default-seed-packs",
    path: "/seed-packs",
    label: "Seed Packs",
    icon: "Grass",
    component: COMPONENT_MAP["bundled:SeedPacks"],
    source: "default",
    sourceId: null,
    position: 8,
    removable: false,
    visible: true,
    placement: "main",
  },
  {
    id: "default-pack-store",
    path: "/pack-store",
    label: "Pack Store",
    icon: "Store",
    component: COMPONENT_MAP["bundled:PackStore"],
    source: "default",
    sourceId: null,
    position: 9,
    removable: true,
    visible: false,
    placement: "main",
  },
  {
    id: "default-my-packs",
    path: "/my-packs",
    label: "My Packs",
    icon: "Inventory",
    component: COMPONENT_MAP["bundled:MyPacks"],
    source: "default",
    sourceId: null,
    position: 9.5,
    removable: true,
    visible: false,
    placement: "main",
  },
  {
    id: "default-settings",
    path: "/settings",
    label: "Settings",
    icon: "Settings",
    component: COMPONENT_MAP["bundled:Settings"],
    source: "default",
    sourceId: null,
    position: 200,
    removable: false,
    visible: true,
    placement: "bottom",
  },
];

// Shared stores for view visibility overrides -- all hook instances see the same state.
// hiddenStore: views the user explicitly hid (overrides visible:true default)
// shownStore: views the user explicitly enabled (overrides visible:false default)
const HIDDEN_VIEWS_KEY = "ui.hiddenViews";
const SHOWN_VIEWS_KEY = "ui.shownViews";
const listeners = new Set<() => void>();

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set<string>();
}

let hiddenStore = loadSet(HIDDEN_VIEWS_KEY);
let shownStore = loadSet(SHOWN_VIEWS_KEY);

function getHiddenSnapshot(): Set<string> {
  return hiddenStore;
}

function getShownSnapshot(): Set<string> {
  return shownStore;
}

function subscribeHidden(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function persistSet(key: string, set: Set<string>): void {
  const arr = Array.from(set);
  localStorage.setItem(key, JSON.stringify(arr));
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: JSON.stringify(arr) }),
  }).catch(() => {});
}

function updateVisibility(id: string, visible: boolean): void {
  const nextHidden = new Set(hiddenStore);
  const nextShown = new Set(shownStore);
  if (visible) {
    nextHidden.delete(id);
    nextShown.add(id);
  } else {
    nextShown.delete(id);
    nextHidden.add(id);
  }
  hiddenStore = nextHidden;
  shownStore = nextShown;
  persistSet(HIDDEN_VIEWS_KEY, nextHidden);
  persistSet(SHOWN_VIEWS_KEY, nextShown);
  listeners.forEach((cb) => cb());
}

// Lazy hydration from engine settings (deferred until first hook mount)
let hydrated = false;
function hydrateFromEngine(): void {
  if (hydrated) return;
  hydrated = true;
  fetchSettings()
    .then((data) => {
      let changed = false;
      const savedHidden = data[HIDDEN_VIEWS_KEY];
      if (savedHidden) {
        try {
          hiddenStore = new Set<string>(JSON.parse(savedHidden));
          localStorage.setItem(HIDDEN_VIEWS_KEY, savedHidden);
          changed = true;
        } catch { /* ignore */ }
      }
      const savedShown = data[SHOWN_VIEWS_KEY];
      if (savedShown) {
        try {
          shownStore = new Set<string>(JSON.parse(savedShown));
          localStorage.setItem(SHOWN_VIEWS_KEY, savedShown);
          changed = true;
        } catch { /* ignore */ }
      }
      if (changed) listeners.forEach((cb) => cb());
    })
    .catch(() => {});
}

export function useViewRegistry(): {
  views: ViewEntry[];
  allViews: ViewEntry[];
  hiddenIds: Set<string>;
  setHidden: (id: string, hidden: boolean) => void;
  loading: boolean;
  error: string | null;
} {
  const hydrateRef = useRef(false);
  if (!hydrateRef.current) {
    hydrateRef.current = true;
    hydrateFromEngine();
  }

  const { project } = useActiveProject();
  const orchardId = project?.id ?? null;
  const { generation } = useRefetchOnDashboardEvent(EVENTS.views);

  const [rows, setRows] = useState<OrchardViewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiddenIds = useSyncExternalStore(subscribeHidden, getHiddenSnapshot);
  const shownIds = useSyncExternalStore(subscribeHidden, getShownSnapshot);

  useEffect(() => {
    if (!orchardId) {
      setRows([]);
      return;
    }

    let cancelled = false;
    api
      .listOrchardViews(orchardId)
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orchardId, generation]);

  const setHidden = useCallback((id: string, hidden: boolean) => {
    updateVisibility(id, !hidden);
  }, []);

  // All views (for Settings tab -- includes hidden ones)
  const allViews = useMemo(() => {
    const additions: ViewEntry[] = [];
    for (const row of rows) {
      const isDefault = DEFAULT_VIEWS.some(
        (d) => d.path === row.route_path || d.id === `default-${row.slug}`,
      );
      if (!isDefault) additions.push(rowToEntry(row));
    }
    return [...DEFAULT_VIEWS, ...additions].sort((a, b) => a.position - b.position);
  }, [rows]);

  // Visible views (for NavDrawer and routing).
  // Priority: explicit hide > explicit show > default visible flag.
  const views = useMemo(
    () => allViews.filter((v) => {
      if (hiddenIds.has(v.id)) return false;
      if (shownIds.has(v.id)) return true;
      return v.visible;
    }),
    [allViews, hiddenIds, shownIds],
  );

  return { views, allViews, hiddenIds, setHidden, loading, error };
}
