import type { ToolCall } from "../types/tools";

export interface BrowserSessionData {
  sessionId: string;
  url: string;
}

export interface WindowTarget {
  title?: string;
  app?: string;
  pid?: number;
  bundleId?: string;
}

export interface DesktopSessionData {
  sessionId: string;
  windowTitle: string;
  windowTarget?: WindowTarget;
}

export function extractBrowserSession(toolCalls?: ToolCall[]): BrowserSessionData | null {
  if (!toolCalls) return null;

  let last: BrowserSessionData | null = null;
  for (const tc of toolCalls) {
    if (tc.name !== "browse_url") continue;
    if (tc.status !== "complete" || tc.isError) continue;
    const result = tc.result as Record<string, unknown> | undefined;
    if (!result?.session_id) continue;
    last = {
      sessionId: result.session_id as string,
      url: result.url as string,
    };
  }
  return last;
}

export function extractDesktopSession(toolCalls?: ToolCall[]): DesktopSessionData | null {
  if (!toolCalls) return null;

  let last: DesktopSessionData | null = null;
  for (const tc of toolCalls) {
    if (tc.name !== "open_window") continue;
    if (tc.status !== "complete" || tc.isError) continue;
    const result = tc.result as Record<string, unknown> | undefined;
    if (!result?.session_id) continue;
    last = {
      sessionId: result.session_id as string,
      windowTitle: (result.window_title as string) || "Desktop Window",
      windowTarget: (result.window_target as WindowTarget) || undefined,
    };
  }
  return last;
}
