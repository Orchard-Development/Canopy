/**
 * Desktop RPC Bridge -- connects engine tool calls to Electron IPC.
 *
 * Listens for "desktop:rpc" events on a Phoenix channel. When received,
 * calls the appropriate window.orchard.viewer method and pushes the
 * result back as "desktop:rpc_reply".
 *
 * This bridge is only active in the Electron desktop shell where
 * window.orchard.viewer is available.
 */
import type { Channel } from "phoenix";

interface OrchardViewer {
  screenshot: () => Promise<string>;
  snapshot: () => Promise<Record<string, unknown>>;
  click: (x: number, y: number, button?: "left" | "right") => Promise<unknown>;
  type: (text: string) => Promise<unknown>;
  relayKey: (event: { key: string; modifiers?: string[] }) => Promise<unknown>;
  relayClick: (event: {
    localX: number;
    localY: number;
    button: "left" | "right" | "middle";
    type: "click" | "double_click";
  }) => Promise<unknown>;
}

function getViewer(): OrchardViewer | null {
  const w = window as Record<string, unknown>;
  const orchard = w.orchard as { viewer?: OrchardViewer } | undefined;
  return orchard?.viewer ?? null;
}

interface RpcRequest {
  request_id: string;
  method: string;
  params: Record<string, unknown>;
}

/**
 * Attach the desktop RPC bridge to a chat channel.
 * Returns a cleanup function to detach the bridge.
 */
export function attachDesktopRpcBridge(channel: Channel): () => void {
  const viewer = getViewer();
  if (!viewer) {
    // Not in Electron -- no bridge needed
    return () => {};
  }

  const ref = channel.on("desktop:rpc", async (request: RpcRequest) => {
    const { request_id, method, params } = request;

    try {
      const data = await dispatch(viewer, method, params);
      channel.push("desktop:rpc_reply", {
        request_id,
        result: { ok: true, data },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      channel.push("desktop:rpc_reply", {
        request_id,
        result: { error: message },
      });
    }
  });

  return () => {
    channel.off("desktop:rpc", ref);
  };
}

async function dispatch(
  viewer: OrchardViewer,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (method) {
    case "screenshot":
      return viewer.screenshot();

    case "snapshot":
      return viewer.snapshot();

    case "click":
      return viewer.click(
        params.x as number,
        params.y as number,
        (params.button as "left" | "right") ?? "left",
      );

    case "type":
      return viewer.type(params.text as string);

    case "key":
      return viewer.relayKey({
        key: params.key as string,
        modifiers: (params.modifiers as string[]) ?? [],
      });

    default:
      throw new Error(`Unknown desktop RPC method: ${method}`);
  }
}
