import { useState, useCallback } from "react";
import { api } from "../lib/api";
import { getLanguageForFile } from "../lib/languageMap";

export interface EditorTab {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
}

export function useEditorTabs(rootPath?: string) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const removeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (activeTabPath === path) {
        const idx = prev.findIndex((t) => t.path === path);
        setActiveTabPath((next[idx] ?? next[idx - 1])?.path ?? null);
      }
      return next;
    });
  }, [activeTabPath]);

  const openFile = useCallback(async (path: string) => {
    if (tabs.some((t) => t.path === path)) { setActiveTabPath(path); return; }
    try {
      const r = await api.readFile(path, rootPath);
      if (r.binary) { setError(`Cannot open binary file: ${r.name}`); return; }
      if (r.content == null) { setError(`No content: ${r.name}`); return; }
      setTabs((prev) => [...prev, {
        path: r.path, name: r.name, content: r.content!, originalContent: r.content!,
        language: getLanguageForFile(r.name), isDirty: false,
      }]);
      setActiveTabPath(path);
      setError(null);
    } catch (err) {
      setError(`Failed to open: ${path}`);
      console.error("openFile error:", err);
    }
  }, [tabs, rootPath]);

  const closeTab = useCallback((path: string): boolean => {
    const tab = tabs.find((t) => t.path === path);
    if (!tab) return false;
    if (tab.isDirty && !window.confirm(`Unsaved changes in ${tab.name}. Close anyway?`)) {
      return false;
    }
    removeTab(path);
    return true;
  }, [tabs, removeTab]);

  const forceCloseTab = useCallback((path: string) => removeTab(path), [removeTab]);

  const setActive = useCallback((path: string) => {
    if (tabs.some((t) => t.path === path)) setActiveTabPath(path);
  }, [tabs]);

  const updateContent = useCallback((path: string, newContent: string) => {
    setTabs((prev) => prev.map((t) =>
      t.path === path
        ? { ...t, content: newContent, isDirty: newContent !== t.originalContent }
        : t
    ));
  }, []);

  const saveFile = useCallback(async (path: string) => {
    const tab = tabs.find((t) => t.path === path);
    if (!tab) return;
    try {
      await api.writeFile(path, tab.content);
      setTabs((prev) => prev.map((t) =>
        t.path === path ? { ...t, isDirty: false, originalContent: t.content } : t
      ));
      setError(null);
    } catch (err) {
      setError(`Failed to save: ${path}`);
      console.error("saveFile error:", err);
    }
  }, [tabs]);

  const saveAll = useCallback(async () => {
    for (const tab of tabs.filter((t) => t.isDirty)) await saveFile(tab.path);
  }, [tabs, saveFile]);

  return {
    tabs, activeTabPath, error, openFile, closeTab,
    forceCloseTab, setActiveTab: setActive, updateContent, saveFile, saveAll,
  };
}
