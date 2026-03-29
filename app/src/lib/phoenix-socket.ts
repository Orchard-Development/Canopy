import { Socket } from "phoenix";

/**
 * Default engine port. The Vite dev server proxies /api to this port,
 * but Phoenix channels need a direct WebSocket connection to the engine
 * endpoint at /socket.
 */
const DEFAULT_ENGINE_PORT = 19470;

let socketInstance: Socket | null = null;

/**
 * Derive the engine WebSocket URL for Phoenix channels.
 *
 * In dev, the Vite server runs on a different port than the engine, so we
 * connect directly to the engine. In production (same origin), we use the
 * current host.
 */
function resolveSocketUrl(): string {
  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";

  // Proxied access (/connect/<machineId>/...): route socket through the proxy.
  // Must be checked before the hostname check because the proxy runs on a non-localhost host.
  const proxyMatch = loc.pathname.match(/^\/connect\/([^/]+)\//);
  if (proxyMatch) {
    return `${protocol}//${loc.host}/connect/${proxyMatch[1]}/socket`;
  }

  // Tunnel access: connect via the tunnel origin (not localhost)
  if (loc.hostname !== "localhost" && loc.hostname !== "127.0.0.1") {
    return `${protocol}//${loc.host}/socket`;
  }

  // Local dev: Vite runs on a different port, connect directly to engine
  const port = loc.port;
  const enginePort =
    port === String(DEFAULT_ENGINE_PORT) ? port : String(DEFAULT_ENGINE_PORT);

  return `${protocol}//127.0.0.1:${enginePort}/socket`;
}

/**
 * Get (or create) the singleton Phoenix Socket connection.
 * The socket auto-reconnects on disconnect.
 */
export function getSocket(): Socket {
  if (socketInstance) return socketInstance;

  const url = resolveSocketUrl();

  socketInstance = new Socket(url, {
    params: () => {
      const tokenMatch = document.cookie.match(/(?:^|;\s*)ctx_token=([^;]*)/);
      if (tokenMatch) return { token: decodeURIComponent(tokenMatch[1]) };
      const sessionMatch = document.cookie.match(/(?:^|;\s*)ctx_session=([^;]*)/);
      if (sessionMatch) return { session_token: decodeURIComponent(sessionMatch[1]) };
      return {};
    },
    reconnectAfterMs: (tries: number) => {
      // Backoff: 1s, 2s, 5s, 10s then cap at 10s
      return [1000, 2000, 5000, 10000][tries - 1] ?? 10000;
    },
    heartbeatIntervalMs: 30000,
  });

  socketInstance.connect();

  return socketInstance;
}

/**
 * Disconnect and discard the singleton socket.
 * Useful for cleanup during hot module replacement.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
