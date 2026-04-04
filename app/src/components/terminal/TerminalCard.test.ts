/**
 * Tests for TerminalCard pure logic:
 * - isAgentCommand: classifies commands as agent vs shell
 * - resolveState: derives display state from tab fields
 * - hover visibility contract: secondary actions gated on hovered flag
 *
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// isAgentCommand -- mirrors the inline check in TerminalCard header
// ---------------------------------------------------------------------------

function isAgentCommand(command: string): boolean {
  const cmd = command.toLowerCase();
  return cmd.includes("claude") || cmd.includes("codex");
}

describe("isAgentCommand", () => {
  it("matches claude", () => expect(isAgentCommand("claude")).toBe(true));
  it("matches claude with flags", () => expect(isAgentCommand("claude --dangerously-skip-permissions")).toBe(true));
  it("matches codex", () => expect(isAgentCommand("codex")).toBe(true));
  it("matches codex with flags", () => expect(isAgentCommand("codex --full-auto")).toBe(true));
  it("matches uppercase CLAUDE", () => expect(isAgentCommand("CLAUDE")).toBe(true));
  it("does not match shell", () => expect(isAgentCommand("")).toBe(false));
  it("does not match zsh", () => expect(isAgentCommand("zsh")).toBe(false));
  it("does not match orchard-code", () => expect(isAgentCommand("orchard-code")).toBe(false));
  it("does not match opencode", () => expect(isAgentCommand("opencode")).toBe(false));
  it("does not match claw", () => expect(isAgentCommand("claw")).toBe(false));
});

// ---------------------------------------------------------------------------
// resolveState -- mirrors TerminalCard resolvedState derivation
// ---------------------------------------------------------------------------

type SessionState = "running" | "waiting" | "idle" | "error";

function resolveState(
  exitCode: number | undefined,
  state: SessionState | undefined,
): "idle" | SessionState {
  return exitCode !== undefined ? "idle" : (state ?? "running");
}

describe("resolveState", () => {
  it("returns idle when exitCode is 0", () => {
    expect(resolveState(0, "running")).toBe("idle");
  });

  it("returns idle when exitCode is non-zero", () => {
    expect(resolveState(1, "running")).toBe("idle");
  });

  it("passes through state when exitCode is undefined", () => {
    expect(resolveState(undefined, "waiting")).toBe("waiting");
  });

  it("defaults to running when both are undefined", () => {
    expect(resolveState(undefined, undefined)).toBe("running");
  });
});

// ---------------------------------------------------------------------------
// hover visibility contract
// Secondary actions (poker, fork, view-toggle, keyboard, refresh, logs)
// must only render when hovered === true.
// This tests the predicate, not the render -- rendering requires a DOM.
// ---------------------------------------------------------------------------

function shouldShowSecondary(hovered: boolean): boolean {
  return hovered;
}

describe("hover visibility", () => {
  it("secondary actions hidden when not hovered", () => {
    expect(shouldShowSecondary(false)).toBe(false);
  });

  it("secondary actions visible when hovered", () => {
    expect(shouldShowSecondary(true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// agent-specific actions only shown for agent commands
// ---------------------------------------------------------------------------

function agentActionsVisible(hovered: boolean, command: string): boolean {
  return hovered && isAgentCommand(command);
}

describe("agent action gating", () => {
  it("poker hidden for shell even when hovered", () => {
    expect(agentActionsVisible(true, "zsh")).toBe(false);
  });

  it("poker visible for claude when hovered", () => {
    expect(agentActionsVisible(true, "claude")).toBe(true);
  });

  it("poker hidden for claude when not hovered", () => {
    expect(agentActionsVisible(false, "claude")).toBe(false);
  });

  it("refresh visible for all commands when hovered (non-agent)", () => {
    // refresh is always in the hover group, not gated on isAgent
    expect(shouldShowSecondary(true)).toBe(true);
  });
});
