import { useState, useEffect, useCallback, useRef } from "react";

export interface PersistedTab {
  path: string;
  scrollPosition: number;
}

const MAX_TABS = 50;
const DEBOUNCE_MS = 500;

function buildKey(projectRoot: string): string {
  return "file-browser-tabs:" + projectRoot;
}

function loadTabs(key: string): PersistedTab[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).path === "string",
    );
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

export function useTabPersistence(projectRoot: string | null) {
  const [restoredTabs, setRestoredTabs] = useState<PersistedTab[]>([]);
  const pendingRef = useRef<PersistedTab[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectRoot) { setRestoredTabs([]); return; }
    setRestoredTabs(loadTabs(buildKey(projectRoot)));
  }, [projectRoot]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const saveTabs = useCallback(
    (tabs: PersistedTab[]) => {
      if (!projectRoot) return;
      pendingRef.current = tabs.slice(0, MAX_TABS);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(buildKey(projectRoot), JSON.stringify(pendingRef.current));
        } catch {
          // QuotaExceededError -- silently ignore
        }
      }, DEBOUNCE_MS);
    },
    [projectRoot],
  );

  const clearTabs = useCallback(() => {
    if (!projectRoot) return;
    localStorage.removeItem(buildKey(projectRoot));
  }, [projectRoot]);

  return { restoredTabs, saveTabs, clearTabs };
}
