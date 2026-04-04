import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: {} }));
vi.mock("../lib/settingsCache", () => ({ fetchSettings: vi.fn() }));
vi.mock("../lib/events", () => ({ EVENTS: {} }));
vi.mock("./useActiveProject", () => ({ useActiveProject: vi.fn() }));
vi.mock("./useRefetchOnDashboardEvent", () => ({ useRefetchOnDashboardEvent: vi.fn() }));

import { DEFAULT_VIEWS } from "./useViewRegistry";

describe("DEFAULT_VIEWS", () => {
  it("does not include culled experimental views", () => {
    const ids = DEFAULT_VIEWS.map((v) => v.id);
    expect(ids).not.toContain("default-openclaw");
    expect(ids).not.toContain("default-autoresearch");
    expect(ids).not.toContain("default-judgment");
    expect(ids).not.toContain("default-swarm");
  });

  it("does not include views culled as not being views", () => {
    const ids = DEFAULT_VIEWS.map((v) => v.id);
    expect(ids).not.toContain("default-interfaces");
    expect(ids).not.toContain("default-capabilities");
    expect(ids).not.toContain("default-application-viewer");
    expect(ids).not.toContain("default-scheduled-tasks");
    expect(ids).not.toContain("default-database-explorer");
  });

  it("includes all core views", () => {
    const ids = new Set(DEFAULT_VIEWS.map((v) => v.id));
    expect(ids.has("default-orchard")).toBe(true);
    expect(ids.has("default-chat")).toBe(true);
    expect(ids.has("default-settings")).toBe(true);
    expect(ids.has("default-proposals")).toBe(true);
    expect(ids.has("default-sessions")).toBe(true);
    expect(ids.has("default-roots-view")).toBe(true);
    expect(ids.has("default-seed-packs")).toBe(true);
  });

  it("marks seed-packs as not removable", () => {
    const seedPacks = DEFAULT_VIEWS.find((v) => v.id === "default-seed-packs");
    expect(seedPacks?.removable).toBe(false);
  });
});
