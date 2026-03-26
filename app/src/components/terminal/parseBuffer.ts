import type { SessionMessage } from "../../hooks/useSessionMessages";

const CHROME_RE = new RegExp(
  [
    /bypass\s*permissions?\s*(on|off)/i.source,
    /shift\+tab\s*to\s*cycle/i.source,
    /\(tab\s*to\s*cycle\)/i.source,
    /Claude\s*Code\s*v[\d.]+/i.source,
    /auto-?updating/i.source,
    /Tomfoolering/i.source,
    /Frolicking/i.source,
    /Moonwalking/i.source,
    /[◐◑◒◓⏵⏸]\s*(medium|high|low)/i.source,
    /Press\s*Ctrl-C\s*again\s*to\s*exit/i.source,
    /\d+(\.\d+)?[km]?\s*tokens/i.source,
    /Co-Authored-By:\s*Claude/i.source,
  ].join("|"),
);

const SPINNER_RE = /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏✳✶✻✽✢⣾⣽⣻⢿⡿⣟⣯⣷⠂⠐◐◑◒◓⏺⏵⏸▗▖▘▝\s·.]+$/;
const BOX_DRAW_RE = /^[│┃╭┌╰└╮┐╯┘─━][─━│┃╭┌╰└╮┐╯┘\s]/;
const STATUS_FRAG_RE = /^(Opu|s\s*4|Cla|ude|Max|Co\s*de|▘▘|▝▝|▗\s*▗|▖\s*▖)/;
const USER_PROMPT_RE = /^[❯$%>]\s+(.+)/;

/** Strip image reference placeholders from a line */
function stripImageRefs(line: string): string {
  return line.replace(/\[Image\s*#?\d+\]\s*(\(.*?\))?\s*/gi, "").trim();
}

function isNoiseLine(trimmed: string): boolean {
  if (!trimmed) return true;
  if (CHROME_RE.test(trimmed)) return true;
  if (SPINNER_RE.test(trimmed)) return true;
  if (BOX_DRAW_RE.test(trimmed)) return true;
  if (STATUS_FRAG_RE.test(trimmed)) return true;
  if (trimmed.length < 3 && !/^[#*\->]/.test(trimmed)) return true;
  if (/^[❯$%>]\s*$/.test(trimmed)) return true;
  if (/^\[process exited/.test(trimmed)) return true;
  if (/^\[disconnected\]/.test(trimmed)) return true;
  // Pure image reference lines
  if (/^\[Image\s*#?\d+\]\s*(\(.*?\))?\s*$/.test(trimmed)) return true;
  return false;
}

function looksLikeCode(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^(import |from |export |const |let |var |function |class |def |async |return |if |else |for |while |switch |case |try |catch )/.test(t)) return true;
  if (/^(public |private |protected |static |interface |type |enum |struct |impl |fn |mod |use |package |require)/.test(t)) return true;
  if (/[{};]$/.test(t)) return true;
  if (/^[})\]]/.test(t)) return true;
  if (/^\s*(\/\/|#|--|\/\*|\*)/.test(t)) return true;
  if (/=>|->|\|\||&&/.test(t)) return true;
  if (/^\s*@\w+/.test(t)) return true;
  if (/^\s*\w+\s*[=(]/.test(t) && /[;,{(]$/.test(t)) return true;
  return false;
}

function restoreCodeFences(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const indent = line.match(/^(\s+)/)?.[1]?.length ?? 0;

    if (indent >= 2 || looksLikeCode(line)) {
      const codeLines: string[] = [];
      while (i < lines.length) {
        const cl = lines[i];
        const ci = cl.match(/^(\s+)/)?.[1]?.length ?? 0;
        const isEmpty = !cl.trim();
        const isCode = ci >= 2 || looksLikeCode(cl);
        if (isEmpty && i + 1 < lines.length) {
          const next = lines[i + 1];
          const ni = next.match(/^(\s+)/)?.[1]?.length ?? 0;
          if (ni >= 2 || looksLikeCode(next)) {
            codeLines.push(cl);
            i++;
            continue;
          }
        }
        if (isCode || isEmpty) {
          codeLines.push(cl);
          i++;
        } else {
          break;
        }
      }
      const nonEmpty = codeLines.filter((l) => l.trim());
      if (nonEmpty.length >= 2) {
        result.push("```");
        for (const cl of codeLines) result.push(cl);
        result.push("```");
      } else {
        for (const cl of codeLines) result.push(cl);
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}

export interface ParsedBuffer {
  messages: SessionMessage[];
  /** The unsent text at the current prompt, if any */
  draft: string;
}

/**
 * Parse raw terminal buffer text into SessionMessage[] using heuristics.
 * Used as a fallback when the Claude JSONL API is unavailable.
 */
export function parseBufferToMessages(raw: string): ParsedBuffer {
  if (!raw) return { messages: [], draft: "" };

  const lines = raw.split("\n");
  const turns: SessionMessage[] = [];
  let currentLines: string[] = [];
  let currentRole: "user" | "assistant" | null = null;

  const flush = () => {
    if (!currentRole || !currentLines.length) return;
    while (currentLines.length && !currentLines[currentLines.length - 1].trim()) {
      currentLines.pop();
    }
    while (currentLines.length && !currentLines[0].trim()) {
      currentLines.shift();
    }
    let content = currentLines.join("\n").trim();
    if (content) {
      if (currentRole === "assistant") {
        content = restoreCodeFences(content);
      }
      turns.push({ role: currentRole, text: content });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isNoiseLine(trimmed)) continue;

    const promptMatch = USER_PROMPT_RE.exec(trimmed);
    if (promptMatch) {
      flush();
      currentRole = "user";
      currentLines.push(promptMatch[1]);
      continue;
    }

    if (!currentRole) continue;

    if (currentRole === "user" && currentLines.length > 0) {
      flush();
      currentRole = "assistant";
    }

    // Strip image references from content lines
    const cleaned = stripImageRefs(line);
    if (cleaned) currentLines.push(cleaned);
  }

  flush();

  // Extract trailing user turn as unsent draft
  let draft = "";
  if (turns.length > 0 && turns[turns.length - 1].role === "user") {
    draft = turns.pop()!.text;
  }

  return { messages: turns, draft };
}
