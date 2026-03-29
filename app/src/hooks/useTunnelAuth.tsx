import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type HostAuthStatus = "none" | "waiting" | "approved" | "denied";

interface TunnelAuthState {
  pinRequired: boolean;
  hostAuthStatus: HostAuthStatus;
  requestPin: () => void;
  clearPin: () => void;
  requestHostAuth: () => void;
}

const TunnelAuthContext = createContext<TunnelAuthState>({
  pinRequired: false,
  hostAuthStatus: "none",
  requestPin: () => {},
  clearPin: () => {},
  requestHostAuth: () => {},
});

export function useTunnelAuth() {
  return useContext(TunnelAuthContext);
}

/** Singleton so the fetch interceptor can trigger the modal without React. */
let globalRequestPin: (() => void) | null = null;
let globalRequestHostAuth: (() => void) | null = null;

export function TunnelAuthProvider({ children }: { children: ReactNode }) {
  const [pinRequired, setPinRequired] = useState(false);
  const [hostAuthStatus, setHostAuthStatus] = useState<HostAuthStatus>("none");

  const requestPin = useCallback(() => setPinRequired(true), []);
  const clearPin = useCallback(() => setPinRequired(false), []);

  const requestHostAuth = useCallback(() => {
    if (hostAuthStatus === "waiting") return;
    setHostAuthStatus("waiting");
    originalFetch(proxyUrl("/api/tunnel/request-auth"), { method: "POST" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.status === "approved") {
          setHostAuthStatus("approved");
          window.location.reload();
        } else if (body.status === "local") {
          setHostAuthStatus("none");
        } else {
          setHostAuthStatus("denied");
        }
      })
      .catch(() => setHostAuthStatus("denied"));
  }, [hostAuthStatus]);

  useEffect(() => {
    globalRequestPin = requestPin;
    globalRequestHostAuth = requestHostAuth;
    return () => {
      globalRequestPin = null;
      globalRequestHostAuth = null;
    };
  }, [requestPin, requestHostAuth]);

  // On mount, probe whether we need a PIN (tunnel + no valid cookie)
  useEffect(() => {
    detectTunnelPin().then((needed) => {
      if (needed) setPinRequired(true);
    });
  }, []);

  return (
    <TunnelAuthContext.Provider value={{ pinRequired, hostAuthStatus, requestPin, clearPin, requestHostAuth }}>
      {children}
    </TunnelAuthContext.Provider>
  );
}

function isLocalAccess(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Probe whether we're on a tunnel that requires PIN auth.
 * Sends a dummy POST; if we get back the tunnel 403, PIN is needed.
 * Skips the probe entirely for local access.
 */
async function detectTunnelPin(): Promise<boolean> {
  if (isLocalAccess()) return false;
  try {
    const res = await originalFetch(proxyUrl("/api/tunnel/probe"), { method: "POST" });
    if (res.status === 403) {
      const body = await res.json().catch(() => null);
      return body?.error?.includes("tunnel") ?? false;
    }
    return false;
  } catch {
    return false;
  }
}

// --- Global fetch interceptor ---

// When served through the CF Pages proxy (/connect/<machineId>/...) every
// relative /api/... request must be prefixed so it routes through the proxy.
const _proxyPrefixMatch = window.location.pathname.match(/^\/connect\/([^/]+)\//);
const PROXY_PREFIX = _proxyPrefixMatch ? `/connect/${_proxyPrefixMatch[1]}` : "";

function proxyUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!PROXY_PREFIX) return input;
  if (typeof input === "string" && input.startsWith("/") && !input.startsWith(PROXY_PREFIX)) {
    return `${PROXY_PREFIX}${input}`;
  }
  return input;
}

const originalFetch = window.fetch.bind(window);

window.fetch = async function interceptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await originalFetch(proxyUrl(input), init);

  if (res.status === 403 && !isLocalAccess()) {
    const cloned = res.clone();
    try {
      const body = await cloned.json();
      if (typeof body?.error === "string") {
        if (body.error.includes("PIN")) {
          globalRequestPin?.();
        } else if (body.error.includes("not authorized by host")) {
          globalRequestHostAuth?.();
        }
      }
    } catch {
      // not JSON, ignore
    }
  }

  return res;
};
