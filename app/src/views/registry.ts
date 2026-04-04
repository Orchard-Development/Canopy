import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

export interface ViewEntry {
  path: string;
  label: string;
  icon: string;
  component: LazyExoticComponent<ComponentType>;
  /** If true, only shown when devMode is active */
  devOnly?: boolean;
}

/** Map of component keys to lazy-loaded React components.
 *  Used by useViewRegistry to resolve `bundled:<Key>` strings from orchard_views. */
export const COMPONENT_MAP: Record<string, LazyExoticComponent<ComponentType>> = {
  "bundled:Chat": lazy(() => import("./Chat")),
  "bundled:Proposals": lazy(() => import("./Proposals")),
  "bundled:SeedPacks": lazy(() => import("./SeedPacks")),
  "bundled:Mesh": lazy(() => import("./Mesh")),
  "bundled:Settings": lazy(() => import("./Settings")),
  "bundled:ProjectSessions": lazy(() => import("./ProjectSessions")),
  "bundled:RootsView": lazy(() => import("./RootsView")),
};

/**
 * @deprecated Use useViewRegistry() hook instead. This static array is kept
 * temporarily for backward compatibility during migration.
 */
export const views: ViewEntry[] = [
  {
    path: "/workspace",
    label: "Orchard",
    icon: "Park",
    component: lazy(() => import("./Orchard")),
  },

  {
    path: "/ai",
    label: "Chat",
    icon: "ChatBubbleOutline",
    component: lazy(() => import("./Chat")),
  },
  {
    path: "/proposals",
    label: "Proposals",
    icon: "Description",
    component: lazy(() => import("./Proposals")),
  },
  {
    path: "/settings",
    label: "Settings",
    icon: "Settings",
    component: lazy(() => import("./Settings")),
  },
];
