import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const EXCLUDED_KEYS = new Set([
  "nav.current",
  "nav.history",
  "terminal.open",
  "terminal.activeTab",
  "terminal.gridColumns",
  "terminal.gridSpans",
  "terminal.drawerWidth",
]);

interface CloudSync {
  pushToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  pushing: boolean;
  pulling: boolean;
  lastSynced: string | null;
  error: string | null;
}

function filterSyncable(settings: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!EXCLUDED_KEYS.has(key)) result[key] = value;
  }
  return result;
}

export function useCloudSync(): CloudSync {
  const { user } = useAuth();
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pushToCloud() {
    if (!user) return;
    setPushing(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch local settings");
      const settings = await res.json();
      const syncable = filterSyncable(settings);

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          settings: syncable,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw new Error(upsertError.message);
      const now = new Date().toISOString();
      setLastSynced(now);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloud_last_synced: now }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPushing(false);
    }
  }

  async function pullFromCloud() {
    if (!user) return;
    setPulling(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("settings, updated_at")
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if (!data) throw new Error("No cloud settings found");

      const settings = data.settings as Record<string, string>;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to write settings locally");

      const synced = data.updated_at as string;
      setLastSynced(synced);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPulling(false);
    }
  }

  return { pushToCloud, pullFromCloud, pushing, pulling, lastSynced, error };
}
