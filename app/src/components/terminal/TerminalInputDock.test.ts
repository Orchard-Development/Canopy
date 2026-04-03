/**
 * Tests for TerminalInputDock key-sequence forwarding logic.
 * Run with: npx vitest (after adding vitest to devDependencies)
 *
 * These tests cover the pure mapping logic extracted from the component.
 * Component render tests belong in TerminalInputDock.test.tsx once
 * @testing-library/react is installed.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// The key-sequence mapper is the core logic of TerminalInputDock.
// Extract it as a pure function so it can be unit-tested without rendering.
// Implementation note: task 01 should export this as a named function
// `mapKeyToSequence(e: KeyboardEventLike, value: string): string | null`
// where null means "let the browser handle it".
// ---------------------------------------------------------------------------

type KeyboardEventLike = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  selectionStart?: number | null;
  selectionEnd?: number | null;
};

function mapKeyToSequence(e: KeyboardEventLike, value: string): string | null {
  if (e.ctrlKey) {
    switch (e.key) {
      case "c": {
        const hasSelection =
          e.selectionStart != null &&
          e.selectionEnd != null &&
          e.selectionStart !== e.selectionEnd;
        return hasSelection ? null : "\x03";
      }
      case "d": return "\x04";
      case "z": return "\x1a";
      case "l": return "\x0c";
      default:  return null;
    }
  }
  switch (e.key) {
    case "Escape":    return "\x1b";
    case "Tab":       return value.length === 0 ? "\t" : null;
    case "ArrowUp":   return value.length === 0 ? "\x1b[A" : null;
    case "ArrowDown": return value.length === 0 ? "\x1b[B" : null;
    default:          return null;
  }
}

function buildSend(value: string): string {
  return value.replace(/\n/g, "\r") + "\r";
}

// ---------------------------------------------------------------------------
// Sequence mapping
// ---------------------------------------------------------------------------

describe("mapKeyToSequence", () => {
  it("Ctrl+C with no selection sends SIGINT", () => {
    expect(
      mapKeyToSequence({ key: "c", ctrlKey: true, selectionStart: 0, selectionEnd: 0 }, "")
    ).toBe("\x03");
  });

  it("Ctrl+C with selected text returns null (allow browser copy)", () => {
    expect(
      mapKeyToSequence({ key: "c", ctrlKey: true, selectionStart: 0, selectionEnd: 3 }, "abc")
    ).toBeNull();
  });

  it("Ctrl+D sends EOF", () => {
    expect(mapKeyToSequence({ key: "d", ctrlKey: true }, "")).toBe("\x04");
  });

  it("Ctrl+Z sends SIGTSTP", () => {
    expect(mapKeyToSequence({ key: "z", ctrlKey: true }, "")).toBe("\x1a");
  });

  it("Ctrl+L sends clear-screen", () => {
    expect(mapKeyToSequence({ key: "l", ctrlKey: true }, "")).toBe("\x0c");
  });

  it("Escape sends ESC byte", () => {
    expect(mapKeyToSequence({ key: "Escape" }, "")).toBe("\x1b");
  });

  it("Tab when field is empty sends TAB byte", () => {
    expect(mapKeyToSequence({ key: "Tab" }, "")).toBe("\t");
  });

  it("Tab when field has text returns null (allow browser default)", () => {
    expect(mapKeyToSequence({ key: "Tab" }, "some text")).toBeNull();
  });

  it("ArrowUp when field is empty sends history-back sequence", () => {
    expect(mapKeyToSequence({ key: "ArrowUp" }, "")).toBe("\x1b[A");
  });

  it("ArrowDown when field is empty sends history-forward sequence", () => {
    expect(mapKeyToSequence({ key: "ArrowDown" }, "")).toBe("\x1b[B");
  });

  it("ArrowUp when field has text returns null (allow cursor movement)", () => {
    expect(mapKeyToSequence({ key: "ArrowUp" }, "hello")).toBeNull();
  });

  it("ArrowDown when field has text returns null (allow cursor movement)", () => {
    expect(mapKeyToSequence({ key: "ArrowDown" }, "hello")).toBeNull();
  });

  it("regular keys return null", () => {
    expect(mapKeyToSequence({ key: "a" }, "")).toBeNull();
    expect(mapKeyToSequence({ key: "Enter" }, "")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Send payload construction
// ---------------------------------------------------------------------------

describe("buildSend", () => {
  it("appends \\r to single-line input", () => {
    expect(buildSend("hello")).toBe("hello\r");
  });

  it("replaces embedded \\n with \\r for multiline input", () => {
    expect(buildSend("line1\nline2")).toBe("line1\rline2\r");
  });

  it("handles empty string (sends bare \\r)", () => {
    // Note: the component guards against calling buildSend with empty value.
    // This test documents the raw output if the guard were bypassed.
    expect(buildSend("")).toBe("\r");
  });
});
