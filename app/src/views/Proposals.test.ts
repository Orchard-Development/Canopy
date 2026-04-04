/**
 * Tests for Proposals pure logic:
 * - taskProgress: derives completion percentage from task counts
 * - resolveListProjectId: determines which projectId to pass to listProposals
 * - showAllToggleVisible: switch only appears when a project is active
 * - shouldShowEmptyState: empty state renders inline (toolbar always visible)
 *
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// taskProgress -- mirrors the inline function in Proposals.tsx
// ---------------------------------------------------------------------------

function taskProgress(tasksByStatus: Record<string, number>, total: number): number {
  if (total === 0) return 0;
  return Math.round(((tasksByStatus?.completed ?? 0) / total) * 100);
}

describe("taskProgress", () => {
  it("returns 0 when total is 0", () => {
    expect(taskProgress({}, 0)).toBe(0);
  });

  it("returns 0 when no completed tasks", () => {
    expect(taskProgress({ draft: 3 }, 3)).toBe(0);
  });

  it("returns 100 when all tasks completed", () => {
    expect(taskProgress({ completed: 4 }, 4)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(taskProgress({ completed: 1 }, 3)).toBe(33);
  });

  it("handles missing completed key", () => {
    expect(taskProgress({ "in-progress": 2 }, 2)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveListProjectId -- mirrors load() logic in Proposals.tsx
// showAll=true => undefined (all proposals); showAll=false => use projectId
// ---------------------------------------------------------------------------

function resolveListProjectId(showAll: boolean, projectId: string | undefined): string | undefined {
  return showAll ? undefined : (projectId ?? undefined);
}

describe("resolveListProjectId", () => {
  it("returns undefined when showAll is true, ignoring projectId", () => {
    expect(resolveListProjectId(true, "proj-123")).toBeUndefined();
  });

  it("returns undefined when showAll is true and projectId is also undefined", () => {
    expect(resolveListProjectId(true, undefined)).toBeUndefined();
  });

  it("returns projectId when showAll is false and projectId is set", () => {
    expect(resolveListProjectId(false, "proj-123")).toBe("proj-123");
  });

  it("returns undefined when showAll is false and no projectId", () => {
    expect(resolveListProjectId(false, undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// showAllToggleVisible -- switch only renders when a project is active
// ---------------------------------------------------------------------------

function showAllToggleVisible(projectId: string | undefined): boolean {
  return !!projectId;
}

describe("showAllToggleVisible", () => {
  it("hidden when no project is active", () => {
    expect(showAllToggleVisible(undefined)).toBe(false);
  });

  it("visible when a project is active", () => {
    expect(showAllToggleVisible("proj-abc")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shouldShowEmptyState -- empty state is inline (toolbar always stays mounted)
// Previously an early return; now conditional so the switch remains accessible
// ---------------------------------------------------------------------------

function shouldShowEmptyState(proposalCount: number): boolean {
  return proposalCount === 0;
}

describe("shouldShowEmptyState", () => {
  it("shows empty state when list is empty", () => {
    expect(shouldShowEmptyState(0)).toBe(true);
  });

  it("does not show empty state when proposals exist", () => {
    expect(shouldShowEmptyState(1)).toBe(false);
    expect(shouldShowEmptyState(10)).toBe(false);
  });
});
