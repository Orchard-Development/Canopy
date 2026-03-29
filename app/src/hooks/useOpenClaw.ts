import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { OpenClawStatus, OpenClawChannel, OpenClawMessage } from "../lib/api";
import { useDashboardChannel } from "./useDashboardChannel";
import { useChannelEventBuffer } from "./useChannelEvent";
import { useRefetchOnDashboardEvent } from "./useRefetchOnDashboardEvent";
import { EVENTS } from "../lib/events";

export interface InstallResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function useOpenClaw() {
  const { channel } = useDashboardChannel();
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [channels, setChannels] = useState<OpenClawChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<InstallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { generation: g1 } = useRefetchOnDashboardEvent(EVENTS.openclaw.started);
  const { generation: g2 } = useRefetchOnDashboardEvent(EVENTS.openclaw.stopped);
  const { generation: g3 } = useRefetchOnDashboardEvent(EVENTS.openclaw.health);

  const inbound = useChannelEventBuffer<OpenClawMessage>(
    channel, EVENTS.openclaw.messageInbound, 100,
  );
  const outbound = useChannelEventBuffer<OpenClawMessage>(
    channel, EVENTS.openclaw.messageOutbound, 100,
  );

  const messages: OpenClawMessage[] = [
    ...inbound.map((m) => ({ ...m, direction: "inbound" as const, timestamp: Date.now() })),
    ...outbound.map((m) => ({ ...m, direction: "outbound" as const, timestamp: Date.now() })),
  ].slice(-100);

  const refresh = useCallback(() => {
    api.openclawStatus()
      .then((s) => { setStatus(s); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    api.openclawChannels()
      .then((r) => setChannels(r.channels ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh, g1, g2, g3]);

  const install = useCallback(() => {
    setInstalling(true);
    setInstallResult(null);
    setError(null);
    api.openclawInstall()
      .then((res: Record<string, unknown>) => {
        const ok = !!res.ok;
        const output = String(res.output ?? "");
        const err = res.error ? String(res.error) : undefined;
        setInstallResult({ ok, output, error: err });
        if (!ok && err) setError(err);
        refresh();
      })
      .catch((e) => {
        const msg = e?.message || "Install failed";
        setInstallResult({ ok: false, output: "", error: msg });
        setError(msg);
      })
      .finally(() => setInstalling(false));
  }, [refresh]);

  const setEnabled = useCallback((enabled: boolean) => {
    api.openclawSetEnabled(enabled).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const start = useCallback(() => {
    api.openclawStart().then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const stop = useCallback(() => {
    api.openclawStop().then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const restart = useCallback(() => {
    api.openclawRestart().then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const updateChannel = useCallback((name: string, updates: Record<string, unknown>) => {
    api.openclawUpdateChannel(name, updates).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const addChannel = useCallback((name: string) => {
    api.openclawCreateChannel(name).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  const removeChannel = useCallback((name: string) => {
    api.openclawDeleteChannel(name).then(refresh).catch((e) => setError(e.message));
  }, [refresh]);

  return {
    status, channels, messages, loading, installing, installResult, error,
    install, setEnabled, start, stop, restart,
    updateChannel, addChannel, removeChannel, refresh,
  };
}
