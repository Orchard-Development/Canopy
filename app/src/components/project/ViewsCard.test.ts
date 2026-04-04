import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: {} }));
vi.mock("../../lib/settingsCache", () => ({ fetchSettings: vi.fn() }));
vi.mock("../../lib/events", () => ({ EVENTS: {} }));
vi.mock("../../hooks/useActiveProject", () => ({ useActiveProject: vi.fn() }));
vi.mock("../../hooks/useRefetchOnDashboardEvent", () => ({ useRefetchOnDashboardEvent: vi.fn() }));
vi.mock("../../hooks/useViewRegistry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/useViewRegistry")>();
  return { ...actual, useViewRegistry: vi.fn() };
});

import { REQUIRED_VIEW_IDS } from "./ViewsCard";

describe("REQUIRED_VIEW_IDS", () => {
  it("includes orchard, chat, and settings", () => {
    expect(REQUIRED_VIEW_IDS.has("default-orchard")).toBe(true);
    expect(REQUIRED_VIEW_IDS.has("default-chat")).toBe(true);
    expect(REQUIRED_VIEW_IDS.has("default-settings")).toBe(true);
  });

  it("includes seed-packs (removable: false, must show Required chip)", () => {
    expect(REQUIRED_VIEW_IDS.has("default-seed-packs")).toBe(true);
  });

  it("does not mark removable views as required", () => {
    expect(REQUIRED_VIEW_IDS.has("default-proposals")).toBe(false);
    expect(REQUIRED_VIEW_IDS.has("default-sessions")).toBe(false);
    expect(REQUIRED_VIEW_IDS.has("default-roots-view")).toBe(false);
  });
});
