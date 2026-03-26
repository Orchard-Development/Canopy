import { useState, useEffect, useCallback } from "react";
import { useChannel } from "./useChannel";
import { useChannelEvent } from "./useChannelEvent";
import { EVENTS } from "../lib/events";
import { api } from "../lib/api";
import type {
  AutoresearchStatus,
  AutoresearchExperiment,
  AutoresearchCandidate,
  AutoresearchEvalResult,
} from "../lib/api";

export function useAutoresearch() {
  const [status, setStatus] = useState<AutoresearchStatus | null>(null);
  const [history, setHistory] = useState<AutoresearchExperiment[]>([]);
  const [candidates, setCandidates] = useState<AutoresearchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastEval, setLastEval] = useState<AutoresearchEvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { channel } = useChannel("dashboard");
  const started = useChannelEvent(channel, EVENTS.autoresearch.experimentStarted);
  const scored = useChannelEvent(channel, EVENTS.autoresearch.scored);
  const decided = useChannelEvent(channel, EVENTS.autoresearch.decided);
  const evaluating = useChannelEvent(channel, EVENTS.autoresearch.evaluating);
  const modified = useChannelEvent(channel, EVENTS.autoresearch.modified);
  const deferred = useChannelEvent<{ data: { reason?: string } }>(
    channel, EVENTS.autoresearch.deferred,
  );
  const workerError = useChannelEvent<{ data: { reason?: string } }>(
    channel, EVENTS.autoresearch.error,
  );
  const sessionProgress = useChannelEvent<{ data: { session_state?: string } }>(
    channel, EVENTS.autoresearch.sessionProgress,
  );

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.autoresearchStatus().catch(() => null),
      api.autoresearchHistory(50).catch(() => ({ experiments: [] })),
      api.autoresearchCandidates().catch(() => ({ candidates: [] })),
    ])
      .then(([s, h, c]) => {
        if (s) setStatus(s);
        setHistory(h.experiments);
        setCandidates(c.candidates);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Refetch on channel events
  useEffect(() => {
    if (started || scored || decided || evaluating || modified || sessionProgress) loadAll();
  }, [started, scored, decided, evaluating, modified, sessionProgress, loadAll]);

  // Surface deferred/error events
  useEffect(() => {
    if (!deferred) return;
    const reason = deferred.data?.reason ?? "dispatch_active";
    setError(`Waiting: another worker has an active terminal session (${reason}). Will retry on next tick.`);
    setBusy(null);
  }, [deferred]);

  useEffect(() => {
    if (!workerError) return;
    const reason = workerError.data?.reason ?? "unknown";
    setError(`Experiment failed to start: ${reason}`);
    setBusy(null);
  }, [workerError]);

  const start = useCallback(
    (backend = "keywords") => {
      setBusy("starting");
      setError(null);
      return api.autoresearchStart(backend)
        .then(() => loadAll())
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setBusy(null));
    },
    [loadAll],
  );

  const stop = useCallback(
    () => {
      setBusy("stopping");
      return api.autoresearchStop()
        .then(() => loadAll())
        .finally(() => setBusy(null));
    },
    [loadAll],
  );

  const evaluate = useCallback(
    (backend = "keywords") => {
      setBusy("evaluating");
      setError(null);
      setLastEval(null);
      return api.autoresearchEvaluate(backend)
        .then((result) => {
          setLastEval(result);
          loadAll();
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          setLastEval({ ok: false, error: msg });
        })
        .finally(() => setBusy(null));
    },
    [loadAll],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    status, history, candidates, loading, busy, error, lastEval,
    actions: { start, stop, evaluate, reload: loadAll, clearError },
  };
}
