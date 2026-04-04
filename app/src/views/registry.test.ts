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

  it("still includes all other bundled views", () => {
    const expected = [
      "bundled:Chat",
      "bundled:Proposals",
      "bundled:Capabilities",
      "bundled:Interfaces",
      "bundled:SeedPacks",
      "bundled:Mesh",
      "bundled:Settings",
      "bundled:ProjectSessions",
      "bundled:RootsView",
      "bundled:ApplicationViewer",
      "bundled:ScheduledTasks",
      "bundled:DatabaseExplorer",
    ];
    for (const key of expected) {
      expect(COMPONENT_MAP).toHaveProperty(key);
    }
  });
});
