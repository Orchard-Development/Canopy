import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { fetchSettings } from "../lib/settingsCache";

const EXCLUDED_KEYS = new Set([
  "nav.current",
  "nav.history",
  "terminal.open",
  "terminal.activeTab",
  "terminal.gridColumns",
  "terminal.gridSpans",
  "terminal.drawerWidth",
  "_branding", // reserved key; written to /api/branding separately, never to flat settings
  // Auth tokens are machine-local; never sync to Supabase
  "auth.access_token",
  "auth.refresh_token",
  // API keys go to user_secrets table, not user_settings JSONB
  "anthropic_api_key",
  "openai_api_key",
  "xai_api_key",
  "gemini_api_key",
  "groq_api_key",
  "openrouter_api_key",
]);

const API_KEY_PROVIDERS: Record<string, string> = {
  anthropic_api_key: "anthropic",
  openai_api_key: "openai",
  xai_api_key: "xai",
  gemini_api_key: "gemini",
  groq_api_key: "groq",
  openrouter_api_key: "openrouter",
};

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
      const [settings, brandingRes] = await Promise.all([
        fetchSettings(),
        fetch("/api/branding"),
      ]);
      const syncable = filterSyncable(settings);

      if (brandingRes.ok) {
        const brandingData = await brandingRes.json();
        syncable["_branding"] = JSON.stringify(brandingData);
      }

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          settings: syncable,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw new Error(upsertError.message);

      // Sync API keys to user_secrets (write-only, encrypted at rest)
      await supabase
        .from("user_secrets")
        .delete()
        .eq("user_id", user.id)
        .is("project_id", null);

      const secretRows = Object.entries(API_KEY_PROVIDERS)
        .filter(([key]) => settings[key])
        .map(([key, provider]) => ({
          user_id: user.id,
          provider,
          secret_value: settings[key],
        }));

      if (secretRows.length > 0) {
        const { error: secretErr } = await supabase
          .from("user_secrets")
          .insert(secretRows);
        if (secretErr) console.warn("Failed to sync secrets:", secretErr.message);
      }

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

      const brandingJson = settings["_branding"];
      if (brandingJson) {
        try {
          const brandingData = JSON.parse(brandingJson);
          await fetch("/api/branding", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(brandingData),
          });
        } catch { /* malformed branding, skip */ }
        delete settings["_branding"];
      }

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
