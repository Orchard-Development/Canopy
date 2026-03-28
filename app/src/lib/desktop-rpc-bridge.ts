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
  relayClick: (event: {
    localX: number;
    localY: number;
    button: "left" | "right" | "middle";
    type: "click" | "double_click";
  }) => Promise<unknown>;
  relayScroll: (event: {
    localX: number;
    localY: number;
    deltaX: number;
    deltaY: number;
  }) => Promise<unknown>;
  relayType: (event: { text: string }) => Promise<unknown>;
  relayKey: (event: { key: string; modifiers?: string[] }) => Promise<unknown>;
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
    case "click":
      return viewer.relayClick({
        localX: params.x as number,
        localY: params.y as number,
        button: (params.button as "left" | "right" | "middle") ?? "left",
        type: (params.type as "click" | "double_click") ?? "click",
      });

    case "scroll":
      return viewer.relayScroll({
        localX: params.x as number,
        localY: params.y as number,
        deltaX: (params.deltaX as number) ?? 0,
        deltaY: (params.deltaY as number) ?? 0,
      });

    case "type":
      return viewer.relayType({ text: params.text as string });

    case "key":
      return viewer.relayKey({
        key: params.key as string,
        modifiers: (params.modifiers as string[]) ?? [],
      });

    default:
      throw new Error(`Unknown desktop RPC method: ${method}`);
  }
}
