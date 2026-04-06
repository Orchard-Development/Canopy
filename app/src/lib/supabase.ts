import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);
export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        autoRefreshToken: false,
      },
    })
  : (null as unknown as SupabaseClient);
