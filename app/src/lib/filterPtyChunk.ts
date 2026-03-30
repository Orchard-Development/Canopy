/**
 * Stateful PTY text filter for pretty mode streaming.
 *
 * Strips ANSI codes, tool markup, JSON blocks, and status chrome from raw PTY
 * output chunks. PTY chunks do not align with block boundaries, so state is
 * carried between calls.
 *
 * Usage:
 *   let state = initialFilterState();
 *   for (const chunk of chunks) {
 *     const result = filterPtyChunk(chunk, state);
 *     state = result.state;
 *     display(result.text);
 *   }
 */

export interface FilterState {
  inXmlBlock: boolean;
  inJsonBlock: boolean;
  jsonDepth: number;
}

export function initialFilterState(): FilterState {
  return { inXmlBlock: false, inJsonBlock: false, jsonDepth: 0 };
}

// Strip ANSI/VT escape sequences (colors, cursor movement, erase, etc.)
const ANSI_RE = /\x1b(?:[@-Z\\-_]|\[[0-9;]*[A-Za-z]|\][^\x07]*\x07)/g;

// XML tags that mark the start/end of tool/thinking blocks.
// Catches any antml:-namespaced tag (e.g. antml:thinking, antml:function_calls, antml:parameter).
const XML_OPEN = /^<(function_calls|invoke|tool_use|tool_name|parameters?|antml:[a-z_]+)\b/;
const XML_CLOSE = /^<\/(function_calls|invoke|tool_use|tool_name|parameters?|antml:[a-z_]+)>/;
// Lines that are only a JSON structural character
const JSON_STRUCT = /^\s*[{}\[\],]\s*$/;
// Spinner-only lines (bare dash/pipe/slash/backslash)
const SPINNER = /^\s*[|/\\-]\s*$/;
// Claude Code status chrome patterns (order matters -- cheaper checks first)
const CHROME_PATTERNS = [
  /^[+|]/,                         // +Wibbling…, | Tip: …
  /^[⏳✓✗⚠►▶·•◇◆○●]/u,          // status glyphs (no space required)
  /Wibbling/,                      // thinking indicator in any position
  /\bTip:/,                        // inline tips
  /shift\+tab/i,                   // keybind hints
  /esc[ +]to[ +]interrupt/i,
  /You['']ve used \d+%/,           // usage limit notices
  /bypass permissions/i,
  /running stop hook/i,
  /^\(shift/i,                     // (shift+tab to cycle)
  /^>\s/,                          // tool input preview lines
  /^\s*\.{3,}\s*$/,               // lines that are only ellipses
  /^[─━═╌╍┄┅]{3,}/,              // box-drawing separator lines
];

function isChrome(line: string): boolean {
  return CHROME_PATTERNS.some((re) => re.test(line));
}

export function filterPtyChunk(
  chunk: string,
  state: FilterState,
): { text: string; state: FilterState } {
  // Strip ANSI escape sequences first
  const clean = chunk.replace(ANSI_RE, "");

  // Normalize \r\n -> \n, then handle bare \r as line terminator.
  // For lines with embedded \r (PTY overwrite), take the last segment --
  // this simulates what a real terminal would show after the cursor moves to col 0.
  const normalized = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = normalized.split("\n");
  const kept: string[] = [];
  let { inXmlBlock, inJsonBlock, jsonDepth } = state;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // XML block tracking
    if (XML_OPEN.test(line)) {
      inXmlBlock = true;
      continue;
    }
    if (inXmlBlock) {
      if (XML_CLOSE.test(line)) inXmlBlock = false;
      continue;
    }

    // JSON block tracking
    if (!inJsonBlock && /^\s*[{[]/.test(line)) {
      inJsonBlock = true;
      jsonDepth = 1;
      continue;
    }
    if (inJsonBlock) {
      for (const ch of line) {
        if (ch === "{" || ch === "[") jsonDepth++;
        else if (ch === "}" || ch === "]") jsonDepth--;
      }
      if (jsonDepth <= 0) {
        inJsonBlock = false;
        jsonDepth = 0;
      }
      continue;
    }

    // Structural-only lines outside a tracked block (stray commas, brackets)
    if (JSON_STRUCT.test(line)) continue;
    // Spinner-only lines
    if (SPINNER.test(line)) continue;
    // Claude Code UI chrome
    if (isChrome(line)) continue;

    kept.push(raw);
  }

  // Collapse runs of blank lines to at most one, and strip leading blank lines.
  const collapsed: string[] = [];
  for (const line of kept) {
    const isBlank = line.trim() === "";
    if (isBlank && (collapsed.length === 0 || collapsed[collapsed.length - 1].trim() === "")) {
      continue;
    }
    collapsed.push(line);
  }

  return {
    text: collapsed.join("\n"),
    state: { inXmlBlock, inJsonBlock, jsonDepth },
  };
}
