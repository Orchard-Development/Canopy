import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "../lib/api";
import type { ProjectFileEntry } from "../lib/api";

export interface FlatTreeEntry {
  entry: ProjectFileEntry;
  depth: number;
}

/** Directories that are always hidden in the file tree. */
const HIDDEN_DIRS = new Set([
  ".git",
  "node_modules",
  "_build",
  "deps",
  ".elixir_ls",
]);

/** Individual file names that are always hidden. */
const HIDDEN_FILES = new Set([".DS_Store"]);

/** Dotfile entries that should remain visible despite the blanket dot-filter. */
const ALLOWED_DOTFILES = new Set([".env", ".gitignore", ".claude"]);

function isHiddenEntry(entry: ProjectFileEntry): boolean {
  if (entry.isDir && HIDDEN_DIRS.has(entry.name)) return true;
  if (!entry.isDir && HIDDEN_FILES.has(entry.name)) return true;
  if (
    entry.name.startsWith(".") &&
    !ALLOWED_DOTFILES.has(entry.name)
  ) {
    return true;
  }
  return false;
}

function filterEntries(entries: ProjectFileEntry[]): ProjectFileEntry[] {
  return entries.filter((e) => !isHiddenEntry(e));
}

function sortEntries(entries: ProjectFileEntry[]): ProjectFileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function useFileTree(rootPath: string | null) {
  const [children, setChildren] = useState<Map<string, ProjectFileEntry[]>>(
    new Map(),
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const initialFetchDone = useRef(false);

  // Reset state when rootPath changes
  useEffect(() => {
    initialFetchDone.current = false;
    setChildren(new Map());
    setExpanded(new Set());
    setLoading(new Set());
    setError(null);
    setFilter("");

    if (!rootPath) return;

    setLoading(new Set([rootPath]));
    let cancelled = false;

    api
      .browseDir(rootPath)
      .then((entries) => {
        if (cancelled) return;
        const sorted = sortEntries(filterEntries(entries));
        setChildren(new Map([[rootPath, sorted]]));
        setError(null);
        initialFetchDone.current = true;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load directory";
        setError(msg);
        initialFetchDone.current = true;
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(new Set());
      });

    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const addLoading = useCallback((path: string) => {
    setLoading((prev) => new Set(prev).add(path));
  }, []);

  const removeLoading = useCallback((path: string) => {
    setLoading((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const fetchFolder = useCallback(
    async (path: string): Promise<ProjectFileEntry[]> => {
      if (!rootPath) return [];
      addLoading(path);
      try {
        const entries = await api.browseDir(path);
        const sorted = sortEntries(filterEntries(entries));
        setChildren((prev) => new Map(prev).set(path, sorted));
        setError(null);
        return sorted;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load directory";
        setError(msg);
        return [];
      } finally {
        removeLoading(path);
      }
    },
    [rootPath, addLoading, removeLoading],
  );

  const expandFolder = useCallback(
    (path: string) => {
      if (!rootPath) return;
      setExpanded((prev) => new Set(prev).add(path));
      if (!children.has(path)) {
        fetchFolder(path);
      }
    },
    [rootPath, children, fetchFolder],
  );

  const collapseFolder = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const refreshFolder = useCallback(
    (path?: string) => {
      const target = path ?? rootPath;
      if (!target) return;
      fetchFolder(target);
    },
    [rootPath, fetchFolder],
  );

  const isLoading = useCallback(
    (path: string): boolean => loading.has(path),
    [loading],
  );

  const initialLoading = rootPath
    ? !initialFetchDone.current && loading.has(rootPath)
    : false;

  const tree = useMemo((): FlatTreeEntry[] => {
    if (!rootPath) return [];
    const lowerFilter = filter.toLowerCase();

    function matchesFilter(entry: ProjectFileEntry): boolean {
      if (!lowerFilter) return true;
      return entry.name.toLowerCase().includes(lowerFilter);
    }

    function hasMatchingDescendant(dirPath: string): boolean {
      const entries = children.get(dirPath);
      if (!entries) return false;
      return entries.some(
        (e) =>
          matchesFilter(e) ||
          (e.isDir && expanded.has(e.path) && hasMatchingDescendant(e.path)),
      );
    }

    function walk(dirPath: string, depth: number): FlatTreeEntry[] {
      const entries = children.get(dirPath);
      if (!entries) return [];
      const result: FlatTreeEntry[] = [];
      for (const entry of entries) {
        const matches = matchesFilter(entry);
        const descendantMatch =
          entry.isDir && expanded.has(entry.path)
            ? hasMatchingDescendant(entry.path)
            : false;
        if (!lowerFilter || matches || descendantMatch) {
          result.push({ entry, depth });
          if (entry.isDir && expanded.has(entry.path)) {
            result.push(...walk(entry.path, depth + 1));
          }
        }
      }
      return result;
    }

    return walk(rootPath, 0);
  }, [rootPath, children, expanded, filter]);

  return {
    tree,
    expanded,
    error,
    initialLoading,
    filter,
    expandFolder,
    collapseFolder,
    refreshFolder,
    setFilter,
    isLoading,
  };
}
