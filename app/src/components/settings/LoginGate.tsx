import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { PROXY_BASE } from "../../lib/api";
import { LockBackground } from "./LockBackground";
import { wrap, card, inputStyle, btnPrimary, btnSecondary, errBox, successBox, dividerRow, linkBtn } from "./loginStyles";

const logoUrl = "/logo-icon.png";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured, isOwner, engineSynced } = useAuth();

  if (!configured) return <>{children}</>;
  if (loading) return null;
  if (!user) return <LoginForm />;
  if (isOwner === null) return null;
  if (!isOwner) return <AccessDenied email={user.email ?? "unknown"} />;
  if (engineSynced === null) return null;
  if (engineSynced === false) return <EngineSyncFailed email={user.email ?? "unknown"} />;

  return <>{children}</>;
}

type RequestState = "idle" | "requesting" | "sent" | "error";

function AccessDenied({ email }: { email: string }) {
  const { signOut } = useAuth();
  const [requestState, setRequestState] = useState<RequestState>("idle");

  async function handleRequestAccess() {
    setRequestState("requesting");
    try {
      const res = await fetch(`${PROXY_BASE}/tunnel/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setRequestState(res.ok ? "sent" : "error");
    } catch {
      setRequestState("error");
    }
  }

  return (
    <div style={wrap}>
      <LockBackground />
      <div style={card}>
        <img src={logoUrl} alt="Orchard" width={64} height={64} style={{ borderRadius: 14, marginBottom: 20 }} />
        <div style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 8 }}>Access denied</div>
        <div style={{ fontSize: "0.85rem", color: "rgba(224,224,224,0.6)", textAlign: "center", marginBottom: 28 }}>
          Signed in as <strong style={{ color: "#e0e0e0" }}>{email}</strong>, but this account is not the owner of this node.
        </div>
        {requestState === "sent" && (
          <div style={successBox}>
            Request sent. The node owner has been notified.{" "}
            <button style={linkBtn} onClick={() => setRequestState("idle")}>Send again</button>
          </div>
        )}
        {requestState === "error" && (
          <div style={errBox}>Failed to send request. Try again.</div>
        )}
        {requestState !== "sent" && (
          <button
            style={btnPrimary}
            onClick={handleRequestAccess}
            disabled={requestState === "requesting"}
          >
            {requestState === "requesting" ? "Requesting..." : "Request access"}
          </button>
        )}
        <button style={btnSecondary} onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}

function EngineSyncFailed({ email }: { email: string }) {
  const { signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      // Re-trigger the sync by reloading -- the AuthProvider init will re-run saveTokensToEngine
      window.location.reload();
    } catch {
      setRetrying(false);
    }
  }

  return (
    <div style={wrap}>
      <LockBackground />
      <div style={card}>
        <img src={logoUrl} alt="Orchard" width={64} height={64} style={{ borderRadius: 14, marginBottom: 20 }} />
        <div style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 8 }}>Engine sync failed</div>
        <div style={{ fontSize: "0.85rem", color: "rgba(224,224,224,0.6)", textAlign: "center", marginBottom: 28 }}>
          Signed in as <strong style={{ color: "#e0e0e0" }}>{email}</strong>, but could not
          connect your identity to the Engine. Make sure the Engine is running and try again.
        </div>
        <button style={btnPrimary} onClick={handleRetry} disabled={retrying}>
          {retrying ? "Retrying..." : "Retry"}
        </button>
        <button style={btnSecondary} onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}

type AuthMode = "magic-link" | "password";

export function LoginForm() {
  const { signInWithGoogle, signInWithMagicLink, signUp, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleMagicLink() {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    const result = await signInWithMagicLink(email);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  async function handlePassword() {
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    const result = isSignUp ? await signUp(email, password) : await signInWithPassword(email, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  function handleSubmit() {
    if (mode === "magic-link") handleMagicLink();
    else handlePassword();
  }

  return (
    <div style={wrap}>
      <LockBackground />
      <div style={card}>
        <img src={logoUrl} alt="Orchard" width={64} height={64} style={{ borderRadius: 14, marginBottom: 20 }} />
        <div style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: 6 }}>
          {isSignUp ? "Create account" : "Orchard"}
        </div>
        <div style={{ fontSize: "0.85rem", color: "rgba(224,224,224,0.5)", marginBottom: 28 }}>
          {isSignUp ? "Create an account to get started." : "Sign in to continue."}
        </div>

        <button style={btnSecondary} onClick={signInWithGoogle}>Continue with Google</button>

        <div style={dividerRow}>
          <div style={{ flex: 1, height: 1, background: "rgba(224,224,224,0.1)" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(224,224,224,0.1)" }} />
        </div>

        {sent ? (
          <div style={successBox}>Check your email for a sign-in link.</div>
        ) : (
          <>
            <input
              style={inputStyle}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {mode === "password" && (
              <input
                style={inputStyle}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            )}
            {error && <div style={errBox}>{error}</div>}
            <button style={btnPrimary} onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Loading..." : mode === "magic-link" ? "Send magic link" : isSignUp ? "Sign up" : "Sign in"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 4 }}>
              <button style={linkBtn} onClick={() => setMode(mode === "password" ? "magic-link" : "password")}>
                {mode === "password" ? "Use magic link" : "Use password"}
              </button>
              {mode === "password" && (
                <button style={linkBtn} onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? "Have an account? Sign in" : "No account? Sign up"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
