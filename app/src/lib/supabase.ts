import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://ynbgzurbwgxxjcgpovnr.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYmd6dXJid2d4eGpjZ3Bvdm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjAyOTIsImV4cCI6MjA4ODg5NjI5Mn0.h_bbVLspkQ1Cn_d2waO1hItleEsEn_9erKxQAUP8Lmo";

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient);
