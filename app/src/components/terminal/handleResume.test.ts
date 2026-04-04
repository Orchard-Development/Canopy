/**
 * Tests for the handleResume in-place tab replacement logic.
 *
 * handleResume replaces a dead (exited) tab at its existing index with
 * the new resumed session, keeping activeTab unchanged so focus stays.
 *
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";

interface TabLike {
  id: string;
  label: string;
  command: string;
  nickname: string;
  projectId?: string;
  exitCode?: number;
  cwd?: string;
  startedAt?: string;
}

interface ResumeResult {
  id: string;
  command: string;
  cwd: string;
  startedAt: string;
}

/**
 * Mirrors the setTabs updater inside TerminalDrawer.handleResume.
 * Returns the next tabs array with the dead tab replaced in-place.
 */
function applyResumeReplace(
  prev: TabLike[],
  deadId: string,
  result: ResumeResult,
): TabLike[] {
  const idx = prev.findIndex((t) => t.id === deadId);
  if (idx < 0) return prev;
  const dead = prev[idx];
  const next = [...prev];
  next[idx] = {
    id: result.id,
    label: dead.label,
    command: result.command || dead.command,
    nickname: dead.nickname,
    projectId: dead.projectId,
    cwd: result.cwd || dead.cwd,
    startedAt: result.startedAt,
    // exitCode intentionally omitted -- new session is live
  };
  return next;
}

// ---------------------------------------------------------------------------
// In-place replacement
// ---------------------------------------------------------------------------

describe("applyResumeReplace", () => {
  it("replaces the dead tab at its exact index", () => {
    const tabs: TabLike[] = [
      { id: "a", label: "Claude", command: "claude", nickname: "alpha", exitCode: 0 },
      { id: "b", label: "Shell", command: "zsh", nickname: "beta", exitCode: 1 },
      { id: "c", label: "Codex", command: "codex", nickname: "gamma" },
    ];
    const result: ResumeResult = { id: "b2", command: "zsh", cwd: "/home", startedAt: "2026-01-01" };
    const next = applyResumeReplace(tabs, "b", result);

    expect(next.length).toBe(3);
    expect(next[0].id).toBe("a");
    expect(next[1].id).toBe("b2");
    expect(next[2].id).toBe("c");
  });

  it("preserves label, nickname, and projectId from the dead tab", () => {
    const tabs: TabLike[] = [
      { id: "x", label: "My Session", command: "claude", nickname: "oak", projectId: "proj1", exitCode: 0 },
    ];
    const result: ResumeResult = { id: "x2", command: "claude", cwd: "/work", startedAt: "2026-01-02" };
    const next = applyResumeReplace(tabs, "x", result);

    expect(next[0].label).toBe("My Session");
    expect(next[0].nickname).toBe("oak");
    expect(next[0].projectId).toBe("proj1");
  });

  it("clears exitCode on the replacement tab", () => {
    const tabs: TabLike[] = [
      { id: "dead", label: "Shell", command: "zsh", nickname: "delta", exitCode: 1 },
    ];
    const result: ResumeResult = { id: "live", command: "zsh", cwd: "/tmp", startedAt: "2026-01-03" };
    const next = applyResumeReplace(tabs, "dead", result);

    expect(next[0].exitCode).toBeUndefined();
  });

  it("uses command from result when provided", () => {
    const tabs: TabLike[] = [
      { id: "s", label: "S", command: "old-cmd", nickname: "n", exitCode: 0 },
    ];
    const result: ResumeResult = { id: "s2", command: "new-cmd", cwd: "/", startedAt: "t" };
    const next = applyResumeReplace(tabs, "s", result);

    expect(next[0].command).toBe("new-cmd");
  });

  it("falls back to dead tab command when result command is empty", () => {
    const tabs: TabLike[] = [
      { id: "s", label: "S", command: "fallback-cmd", nickname: "n", exitCode: 0 },
    ];
    const result: ResumeResult = { id: "s2", command: "", cwd: "/", startedAt: "t" };
    const next = applyResumeReplace(tabs, "s", result);

    expect(next[0].command).toBe("fallback-cmd");
  });

  it("returns prev unchanged when tabId is not found", () => {
    const tabs: TabLike[] = [
      { id: "a", label: "A", command: "claude", nickname: "n" },
    ];
    const result: ResumeResult = { id: "z", command: "claude", cwd: "/", startedAt: "t" };
    const next = applyResumeReplace(tabs, "missing", result);

    expect(next).toBe(tabs); // reference equality -- no copy made
  });

  it("activeTab index stays valid after in-place replace", () => {
    const tabs: TabLike[] = [
      { id: "a", label: "A", command: "claude", nickname: "n1" },
      { id: "b", label: "B", command: "zsh", nickname: "n2", exitCode: 0 },
      { id: "c", label: "C", command: "codex", nickname: "n3" },
    ];
    // User is focused on tab index 1 (the dead one)
    const activeTab = 1;
    const result: ResumeResult = { id: "b2", command: "zsh", cwd: "/", startedAt: "t" };
    const next = applyResumeReplace(tabs, "b", result);

    // activeTab still points to index 1, which is now the resumed session
    expect(next[activeTab].id).toBe("b2");
    expect(next[activeTab].exitCode).toBeUndefined();
  });

  it("does not affect other tabs", () => {
    const tabs: TabLike[] = [
      { id: "a", label: "A", command: "claude", nickname: "n1", exitCode: 0 },
      { id: "b", label: "B", command: "zsh", nickname: "n2", exitCode: 1 },
      { id: "c", label: "C", command: "codex", nickname: "n3" },
    ];
    const result: ResumeResult = { id: "b2", command: "zsh", cwd: "/", startedAt: "t" };
    const next = applyResumeReplace(tabs, "b", result);

    expect(next[0]).toBe(tabs[0]); // a is unchanged (same reference)
    expect(next[2]).toBe(tabs[2]); // c is unchanged (same reference)
  });
});

// ---------------------------------------------------------------------------
// attachedSessions set management during resume
// ---------------------------------------------------------------------------

describe("attachedSessions management on resume", () => {
  it("removes dead id and adds new id", () => {
    const attached = new Set(["a", "dead", "c"]);
    const deadId = "dead";
    const newId = "live";

    attached.delete(deadId);
    attached.add(newId);

    expect(attached.has(deadId)).toBe(false);
    expect(attached.has(newId)).toBe(true);
    expect(attached.size).toBe(3); // a, c, live
  });

  it("does not double-add if new id already present (idempotent)", () => {
    const attached = new Set(["a", "live"]);
    const deadId = "dead";
    const newId = "live";

    attached.delete(deadId); // dead was never there -- no-op
    attached.add(newId);    // already there

    expect(attached.size).toBe(2);
  });
});
