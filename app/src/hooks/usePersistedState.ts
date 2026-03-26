import { useState, useCallback, useEffect, useRef } from "react";

type Serializable = string | number | boolean | null | Record<string, unknown> | unknown[];

// In-memory cache so multiple hooks reading the same key on mount don't
// each fire a GET. Populated on first fetch, updated on every write.
let settingsCache: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

export function fetchSettings(): Promise<Record<string, string>> {
  if (settingsCache) return Promise.resolve(settingsCache);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/settings")
    .then((r) => r.json())
    .then((data) => {
      settingsCache = data;
      fetchPromise = null;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return {};
    });
  return fetchPromise;
}

export function persistSetting(key: string, raw: string): void {
  if (settingsCache) settingsCache[key] = raw;
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: raw }),
  }).catch(() => {});
}

function serialize(value: Serializable): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function deserialize<T extends Serializable>(raw: string | undefined, fallback: T): T {
  if (raw === undefined || raw === null) return fallback;
  if (typeof fallback === "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * useState that automatically persists to /api/settings.
 *
 * Works like useState but the value survives page reloads, navigation,
 * and even Electron restarts.
 *
 * @param key   Settings key (e.g. "interfaces.columns")
 * @param fallback  Default value when no persisted value exists
 */
export function usePersistedState<T extends Serializable>(
  key: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValueRaw] = useState<T>(fallback);
  const initialized = useRef(false);

  // Hydrate from server on mount
  useEffect(() => {
    fetchSettings().then((data) => {
      const stored = deserialize(data[key], fallback);
      setValueRaw(stored);
      initialized.current = true;
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueRaw((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        persistSetting(key, serialize(resolved));
        return resolved;
      });
    },
    [key],
  );

  return [value, setValue];
}

/**
 * Invalidate the in-memory settings cache.
 * Call this after bulk writes or if you suspect staleness.
 */
export function invalidateSettingsCache(): void {
  settingsCache = null;
}
