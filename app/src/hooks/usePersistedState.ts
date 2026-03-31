import { useState, useCallback, useEffect, useRef } from "react";
import { fetchSettings, invalidateSettingsCache } from "../lib/settingsCache";

// Re-export so existing consumers (e.g. useChat) keep working.
export { fetchSettings, invalidateSettingsCache };

type Serializable = string | number | boolean | null | Record<string, unknown> | unknown[];

export function persistSetting(key: string, raw: string): void {
  invalidateSettingsCache();
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

