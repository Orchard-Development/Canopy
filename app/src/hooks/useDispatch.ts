import { useState, useCallback, useRef } from "react";
import { api, type DispatchPayload } from "../lib/api";
import { useActiveProject } from "./useActiveProject";
import type { DispatchRecord, AgentType } from "../types/dispatch";

/** Event dispatched to request the App open a terminal session. */
export function requestTerminalOpen(sessionId: string, label: string, extra?: { forkedFrom?: string }) {
  window.dispatchEvent(
    new CustomEvent("ctx:open-terminal", { detail: { sessionId, label, ...extra } }),
  );
}

export function useDispatch() {
  const { project } = useActiveProject();
  const projectId = project?.id;
  const [history, setHistory] = useState<DispatchRecord[]>([]);
  const [payload, setPayload] = useState<DispatchPayload | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-classified payload ready to show instantly when user confirms
  const preClassifiedRef = useRef<DispatchPayload | null>(null);
  const preClassifyingRef = useRef(false);

  /** Classify and immediately show the preview (old behavior, fallback). */
  const classify = useCallback(async (
    input: string,
    agent?: AgentType,
    conversation?: Array<{ role: string; content: string }>,
  ) => {
    setClassifying(true);
    setError(null);
    try {
      const agentParam = agent === "auto" ? undefined : agent;
      const result = await api.dispatch(input, agentParam, conversation);
      setPayload(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Classification failed";
      setError(msg);
      return null;
    } finally {
      setClassifying(false);
    }
  }, []);

  /**
   * Pre-classify in the background without showing the preview.
   * Called automatically when the AI suggests a dispatch.
   */
  const preClassify = useCallback(async (
    input: string,
    agent?: AgentType,
    conversation?: Array<{ role: string; content: string }>,
  ) => {
    preClassifiedRef.current = null;
    preClassifyingRef.current = true;
    try {
      const agentParam = agent === "auto" ? undefined : agent;
      const result = await api.dispatch(input, agentParam, conversation);
      preClassifiedRef.current = result;
      return result;
    } catch {
      // Silently fail -- user can still click and fall back to classify
      return null;
    } finally {
      preClassifyingRef.current = false;
    }
  }, []);

  /**
   * Show the pre-classified preview instantly, or fall back to classify
   * if pre-classification hasn't finished yet.
   */
  const confirmDispatch = useCallback(async (
    input: string,
    agent?: AgentType,
    conversation?: Array<{ role: string; content: string }>,
  ) => {
    if (preClassifiedRef.current) {
      setPayload(preClassifiedRef.current);
      preClassifiedRef.current = null;
      return;
    }
    // Not ready yet -- fall back to classify with loading
    await classify(input, agent, conversation);
  }, [classify]);

  const dispatch = useCallback(async (input: string, p: DispatchPayload, openTerminal = true) => {
    setError(null);
    try {
      const args = [...p.args, p.prompt];
      const cwd = p.cwd || project?.root_path;
      const result = await api.spawnTerminal(p.command, args, cwd, projectId);
      const record: DispatchRecord = {
        id: crypto.randomUUID(),
        input,
        payload: p,
        timestamp: new Date().toISOString(),
        terminalSessionId: result.id,
        status: "dispatched",
      };
      setHistory((prev) => [record, ...prev]);
      setPayload(null);

      if (openTerminal) {
        const label = p.command === "codex" ? "Codex" : "Claude Code";
        requestTerminalOpen(result.id, label);
      }

      // Fire background analysis (no await)
      api.analyze(input, p).catch(() => {});

      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Dispatch failed";
      setError(msg);
      return null;
    }
  }, [project?.root_path, projectId]);

  const createProposal = useCallback(async (
    input: string,
    p: DispatchPayload,
    autoBuild: boolean,
  ) => {
    setError(null);
    try {
      const memoryCtx = p.memoryContext?.summary;
      const result = await api.createProposal(input, memoryCtx, projectId);
      setPayload(null);

      requestTerminalOpen(result.sessionId, "Proposal");

      if (autoBuild) {
        // The proposal session is creating files; we open the terminal
        // and the user can build from the proposals page once ready.
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Proposal creation failed";
      setError(msg);
      return null;
    }
  }, [projectId]);

  /** Show a pre-built payload in the preview immediately. */
  const setPreview = useCallback((p: DispatchPayload) => {
    setPayload(p);
  }, []);

  const clearPreview = useCallback(() => {
    setPayload(null);
    preClassifiedRef.current = null;
    setError(null);
  }, []);

  return {
    history,
    payload,
    classifying,
    error,
    classify,
    preClassify,
    confirmDispatch,
    setPreview,
    dispatch,
    createProposal,
    clearPreview,
  };
}
