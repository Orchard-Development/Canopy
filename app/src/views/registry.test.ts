import { describe, it, expect } from "vitest";
import { COMPONENT_MAP } from "./registry";

describe("COMPONENT_MAP", () => {
  it("does not include KanbanBoard", () => {
    expect("bundled:KanbanBoard" in COMPONENT_MAP).toBe(false);
  });

  it("does not include FileBrowser (now a project tab, not a nav view)", () => {
    expect("bundled:FileBrowser" in COMPONENT_MAP).toBe(false);
  });

  it("does not include MessagingGateway (culled experimental view)", () => {
    expect("bundled:MessagingGateway" in COMPONENT_MAP).toBe(false);
  });

  it("does not include Autoresearch (culled experimental view)", () => {
    expect("bundled:Autoresearch" in COMPONENT_MAP).toBe(false);
  });

  it("does not include Judgment (culled experimental view)", () => {
    expect("bundled:Judgment" in COMPONENT_MAP).toBe(false);
  });

  it("does not include Swarm (culled experimental view)", () => {
    expect("bundled:Swarm" in COMPONENT_MAP).toBe(false);
  });

  it("does not include Interfaces (culled, not a view)", () => {
    expect("bundled:Interfaces" in COMPONENT_MAP).toBe(false);
  });

  it("does not include Capabilities (rewritten as plugins)", () => {
    expect("bundled:Capabilities" in COMPONENT_MAP).toBe(false);
  });

  it("does not include ApplicationViewer (culled, not a view)", () => {
    expect("bundled:ApplicationViewer" in COMPONENT_MAP).toBe(false);
  });

  it("does not include ScheduledTasks (culled, not a view)", () => {
    expect("bundled:ScheduledTasks" in COMPONENT_MAP).toBe(false);
  });

  it("does not include DatabaseExplorer (culled, not a view)", () => {
    expect("bundled:DatabaseExplorer" in COMPONENT_MAP).toBe(false);
  });

  it("still includes all core bundled views", () => {
    const expected = [
      "bundled:Chat",
      "bundled:Proposals",
      "bundled:SeedPacks",
      "bundled:Mesh",
      "bundled:Settings",
      "bundled:ProjectSessions",
      "bundled:RootsView",
    ];
    for (const key of expected) {
      expect(COMPONENT_MAP).toHaveProperty(key);
    }
  });
});
