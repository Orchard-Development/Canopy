/**
 * Single-flight cache for GET /api/settings.
 * All concurrent callers share the same in-flight Promise.
 * Cache expires after 2 seconds so subsequent calls get fresh data.
 */

let inflight: Promise<Record<string, string>> | null = null;
let cached: Record<string, string> | null = null;
let cachedAt = 0;
const TTL_MS = 2_000;

export function fetchSettings(): Promise<Record<string, string>> {
  const now = Date.now();

  if (cached && now - cachedAt < TTL_MS) {
    return Promise.resolve(cached);
  }

  if (inflight) {
    return inflight;
  }

  inflight = fetch("/api/settings")
    .then((r) => r.json())
    .then((data: Record<string, string>) => {
      cached = data;
      cachedAt = Date.now();
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

/** Invalidate the cache (e.g., after a PUT). */
export function invalidateSettingsCache(): void {
  cached = null;
  cachedAt = 0;
}
