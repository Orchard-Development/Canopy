import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured, supabaseUrl, supabaseAnonKey } from "../lib/supabase";
import { PROXY_BASE } from "../lib/api";
import { fetchSettings } from "../lib/settingsCache";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  isOwner: boolean | null;
  engineSynced: boolean | null;
  teamId: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  selectTeam: (teamId: string) => Promise<void>;
}

function isLocalAccess(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

const AuthContext = createContext<AuthState | null>(null);

/** Persist Supabase tokens and profile info to the engine so both Electron and browser share them.
 *  Retries up to 3 times on failure. Returns true if the Engine accepted the write. */
async function saveTokensToEngine(s: Session): Promise<boolean> {
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

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${PROXY_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) return true;
    } catch { /* retry */ }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  console.error("[useAuth] failed to sync auth to Engine after 3 attempts");
  return false;
}

function clearTokensFromEngine(): void {
  fetch(`${PROXY_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "auth.access_token": "",
      "auth.refresh_token": "",
      "auth.user_id": "",
      "auth.team_id": "",
    }),
  }).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [engineSynced, setEngineSynced] = useState<boolean | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  /** Save tokens to Engine and verify via health check. */
  async function syncToEngine(s: Session): Promise<void> {
    const ok = await saveTokensToEngine(s);
    if (ok) {
      // Verify Engine actually has auth.user_id via health
      try {
        const h = await fetch(`${PROXY_BASE}/api/health`).then((r) => r.json());
        setEngineSynced(h.authUserId === true);
      } catch {
        setEngineSynced(ok);
      }
    } else {
      setEngineSynced(false);
    }
  }

  useEffect(() => {
    if (!supabaseConfigured) return;

    async function init() {
      // Try local Supabase session first (works in the browser that did the auth)
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data.session) {
        setSession(data.session);
        syncToEngine(data.session);
        setLoading(false);
        return;
      }

      // No local session -- check if the engine has tokens (Electron picking up browser auth)
      try {
        const settings = await fetchSettings();
        const access = settings["auth.access_token"];
        const refresh = settings["auth.refresh_token"];
        const storedTeamId = settings["auth.team_id"];
        if (storedTeamId) setTeamId(storedTeamId);
        if (access && refresh) {
          const { data: restored, error } = await supabase.auth.setSession({
            access_token: access,
            refresh_token: refresh,
          });
          if (!error && restored.session) {
            setSession(restored.session);
            setEngineSynced(true);
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

        // Persist tokens to Engine on sign-in and token refresh
        if (newSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          syncToEngine(newSession);
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
      if (sessionRef.current) return;
      try {
        const settings = await fetchSettings();
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

  // Keep ref in sync so the polling interval can read current session without stale closure
  useEffect(() => { sessionRef.current = session; }, [session]);

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
    // On tunnel: layered ownership check
    async function checkTunnelOwnership() {
      // 1. Check if the user already has a valid engine tunnel session (from PIN or email gate)
      try {
        const info = await fetch(`${PROXY_BASE}/tunnel/session-info`).then((r) => r.json());
        if (info.valid) { setIsOwner(true); return; }
      } catch { /* continue */ }

      // 2. Check auth-policy: allow_any_user or owner UID match
      let policyAllows = false;
      try {
        const policy = await fetch(`${PROXY_BASE}/tunnel/auth-policy`).then((r) => r.json());
        const isOwnerByUid = policy.owner_uid && policy.owner_uid === session?.user?.id;
        policyAllows = policy.allow_any_user || isOwnerByUid;
      } catch { /* continue */ }

      // 3. If policy allows, exchange the Supabase token for an engine session
      if (policyAllows && session?.access_token) {
        try {
          const res = await fetch(`${PROXY_BASE}/tunnel/auth-supabase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: session.access_token,
              supabase_url: supabaseUrl,
              anon_key: supabaseAnonKey,
            }),
          });
          if (res.ok) { setIsOwner(true); return; }
        } catch { /* continue */ }
        // Policy said yes but session exchange failed — still grant UI access
        setIsOwner(true);
        return;
      }

      // 4. Fall back to settings (requires engine auth / PIN)
      try {
        const r = await fetch(`${PROXY_BASE}/api/settings`);
        if (!r.ok) { setIsOwner(false); return; }
        const settings = await r.json();
        const ownerUid = settings["auth.user_id"];
        setIsOwner(ownerUid ? session?.user?.id === ownerUid : false);
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
    setTeamId(null);
  }

  async function selectTeam(id: string): Promise<void> {
    const res = await fetch(`${PROXY_BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "auth.team_id": id }),
    });
    if (res.ok) setTeamId(id);
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading,
    configured: supabaseConfigured,
    isOwner,
    engineSynced,
    teamId,
    signInWithGoogle,
    signInWithMagicLink,
    signUp,
    signInWithPassword,
    signOut,
    selectTeam,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
