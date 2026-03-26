/**
 * Remote command client — inserts commands into Supabase and
 * subscribes for results via Realtime.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase, supabaseConfigured } from "./supabase";

const DEFAULT_TIMEOUT = 30_000;

interface CommandResult {
  status: string;
  result?: unknown;
  error?: string;
}

/**
 * Insert a command into Supabase and optionally wait for the result.
 * Returns the command ID for tracking.
 */
export async function sendCommand(
  type: string,
  payload: Record<string, unknown> = {},
  opts?: { expiresInMs?: number },
): Promise<string | null> {
  if (!supabaseConfigured) return null;

  const expiresAt = opts?.expiresInMs
    ? new Date(Date.now() + opts.expiresInMs).toISOString()
    : new Date(Date.now() + DEFAULT_TIMEOUT).toISOString();

  const row = {
    type,
    payload,
    status: "pending",
    source: "phone",
    expires_at: expiresAt,
  };

  const { data, error } = await supabase
    .from("commands")
    .insert([row])
    .select("id");

  if (error || !data?.length) {
    console.error("[remote-commands] insert failed:", error?.message);
    return null;
  }

  return (data[0] as { id: string }).id;
}

/**
 * Wait for a command to complete by subscribing to Realtime updates.
 */
export function waitForResult(
  commandId: string,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    if (!supabaseConfigured) {
      resolve({ status: "error", error: "supabase not configured" });
      return;
    }

    const timer = setTimeout(() => {
      channel.unsubscribe();
      resolve({ status: "error", error: "timeout" });
    }, timeoutMs);

    const channel = supabase
      .channel(`cmd-result:${commandId}`)
      .on(
        "postgres_changes" as unknown as "system",
        {
          event: "UPDATE",
          schema: "public",
          table: "commands",
          filter: `id=eq.${commandId}`,
        } as Record<string, unknown>,
        (payload: { new: { status: string; result?: unknown; error?: string } }) => {
          const row = payload.new;
          if (row.status === "pending" || row.status === "running") return;
          clearTimeout(timer);
          channel.unsubscribe();
          resolve({
            status: row.status,
            result: row.result,
            error: row.error,
          });
        },
      )
      .subscribe();
  });
}

// ── React hook ───────────────────────────────────────────────────────

interface UseCommandState {
  loading: boolean;
  result: unknown | null;
  error: string | null;
}

export function useCommand() {
  const [state, setState] = useState<UseCommandState>({
    loading: false,
    result: null,
    error: null,
  });

  const abortRef = useRef(false);

  useEffect(() => {
    return () => { abortRef.current = true; };
  }, []);

  const execute = useCallback(
    async (type: string, payload: Record<string, unknown> = {}) => {
      abortRef.current = false;
      setState({ loading: true, result: null, error: null });

      const id = await sendCommand(type, payload);
      if (!id) {
        setState({ loading: false, result: null, error: "failed to send command" });
        return null;
      }

      const res = await waitForResult(id);

      if (!abortRef.current) {
        setState({
          loading: false,
          result: res.result ?? null,
          error: res.error ?? null,
        });
      }

      return res;
    },
    [],
  );

  return { ...state, execute };
}
