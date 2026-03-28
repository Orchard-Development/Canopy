import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  isOwner: boolean | null;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

function isLocalAccess(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

const AuthContext = createContext<AuthState | null>(null);

/** Persist Supabase tokens and profile info to the engine so both Electron and browser share them. */
function saveTokensToEngine(s: Session): void {
  const meta = s.user?.user_metadata ?? {};
  const profile: Record<string, string> = {
    "auth.access_token": s.access_token,
    "auth.refresh_token": s.refresh_token,
  };
  const name = meta.full_name || meta.name || "";
  const avatar = meta.avatar_url || meta.picture || "";
  if (name) profile.display_name = name;
  if (avatar) profile.avatar_url = avatar;
  if (s.user?.email) profile["auth.email"] = s.user.email;
  if (s.user?.id) profile["auth.user_id"] = s.user.id;

  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  }).catch(() => {});
}

function clearTokensFromEngine(): void {
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "auth.access_token": "",
      "auth.refresh_token": "",
      "auth.user_id": "",
    }),
  }).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;

    async function init() {
      // Try local Supabase session first (works in the browser that did the auth)
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data.session) {
        setSession(data.session);
        if (isLocalAccess()) saveTokensToEngine(data.session);
        setLoading(false);
        return;
      }

      // No local session -- check if the engine has tokens (Electron picking up browser auth)
      try {
        const settings = await fetch("/api/settings").then((r) => r.json());
        const access = settings["auth.access_token"];
        const refresh = settings["auth.refresh_token"];
        if (access && refresh) {
          const { data: restored, error } = await supabase.auth.setSession({
            access_token: access,
            refresh_token: refresh,
          });
          if (!error && restored.session) {
            setSession(restored.session);
            setLoading(false);
            return;
          }
          // Tokens were stale, clear them
          clearTokensFromEngine();
        }
      } catch { /* engine unavailable, skip */ }

      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);

        // Persist new tokens so Electron picks them up (local only)
        if (newSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && isLocalAccess()) {
          saveTokensToEngine(newSession);
        }

        // Clean up auth tokens from URL after successful sign-in
        if (event === "SIGNED_IN" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      },
    );

    // Poll engine for tokens set by the browser (e.g. after magic link in system browser).
    // Stops once a session is established.
    const poll = setInterval(async () => {
      if (session) return;
      try {
        const settings = await fetch("/api/settings").then((r) => r.json());
        const access = settings["auth.access_token"];
        const refresh = settings["auth.refresh_token"];
        if (!access || !refresh) return;
        const { data: restored, error } = await supabase.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        });
        if (!error && restored.session) {
          setSession(restored.session);
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearInterval(poll);
    };
  }, []);

  // Check ownership: local access is always owner; tunnel must match stored user_id
  // unless tunnel_allow_any_user is enabled
  useEffect(() => {
    if (!session?.user) {
      setIsOwner(null);
      return;
    }
    if (isLocalAccess()) {
      setIsOwner(true);
      return;
    }
    // On tunnel: check auth policy first (public endpoint), then fall back to settings
    async function checkTunnelOwnership() {
      // Try the public auth-policy endpoint first (works without PIN)
      try {
        const policy = await fetch("/tunnel/auth-policy").then((r) => r.json());
        if (policy.allow_any_user) {
          setIsOwner(true);
          return;
        }
      } catch { /* endpoint unavailable, continue to settings check */ }

      // Fall back to settings (requires engine auth / PIN)
      try {
        const r = await fetch("/api/settings");
        if (!r.ok) {
          setIsOwner(false);
          return;
        }
        const settings = await r.json();
        const ownerUid = settings["auth.user_id"];
        if (!ownerUid) {
          // No owner set yet -- deny tunnel visitors (owner must sign in locally first)
          setIsOwner(false);
        } else {
          setIsOwner(session.user.id === ownerUid);
        }
      } catch {
        setIsOwner(false);
      }
    }
    checkTunnelOwnership();
  }, [session]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    return { error: error?.message ?? null };
  }

  async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearTokensFromEngine();
    setSession(null);
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading,
    configured: supabaseConfigured,
    isOwner,
    signInWithGoogle,
    signInWithMagicLink,
    signUp,
    signInWithPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
