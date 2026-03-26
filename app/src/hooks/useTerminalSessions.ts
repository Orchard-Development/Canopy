import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { api, getRemoteOrchard, onRemoteOrchardChange } from "../lib/api";
import { useActiveProject } from "./useActiveProject";
import { useChannel } from "./useChannel";
import { useChannelEvent } from "./useChannelEvent";
import { useDefaultCwd } from "../lib/use-default-cwd";
import { randomWord } from "../lib/random-word";
import type { TerminalTab } from "../components/terminal/TerminalDrawerContent";
import type { SessionProfile } from "../components/terminal/ProfileTooltip";

function defaultShell(): string {
  return navigator.platform?.toLowerCase().includes("win") ? "powershell.exe" : "/bin/zsh";
}

function labelForCommand(cmd: string): string {
  if (!cmd || cmd === defaultShell() || cmd.endsWith("/zsh") || cmd.endsWith("/bash")) return "Shell";
  const base = cmd.split("/").pop() ?? cmd;
  const labels: Record<string, string> = { claude: "Claude Code", codex: "Codex" };
  return labels[base] ?? base;
}

/**
 * Manages terminal sessions: listing, spawning, killing, and live state updates.
 * Shared between the terminal drawer and the terminal grid page.
 */
export function useTerminalSessions() {
  const [allTabs, setAllTabs] = useState<TerminalTab[]>([]);
  const [profiles, setProfiles] = useState<Record<string, SessionProfile>>({});
  const { project: activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id;
  const defaultCwd = useDefaultCwd();
  const attachedSessions = useRef(new Set<string>());

  // Re-fetch sessions when remote orchard changes
  const [remoteKey, setRemoteKey] = useState(0);
  useEffect(() => onRemoteOrchardChange(() => setRemoteKey((k) => k + 1)), []);

  const tabs = useMemo(
    () => allTabs.filter((t) =>
      t.node || !t.projectId || !activeProjectId || t.projectId === activeProjectId,
    ),
    [allTabs, activeProjectId],
  );

  // Restore sessions from server on mount and when remote orchard changes
  useEffect(() => {
    let cancelled = false;
    const isRemote = !!getRemoteOrchard().httpUrl;

    Promise.all([
      api.listTerminals(),
      isRemote ? Promise.resolve({}) : fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
    ]).then(async ([sessions, settings]) => {
      if (cancelled) return;
      const restored: TerminalTab[] = sessions
        .filter((s) => s.exitCode == null)
        .map((s) => ({
          id: s.id,
          label: s.label ?? labelForCommand(s.command),
          command: s.command,
          nickname: randomWord(),
          exitCode: s.exitCode,
          state: s.state as TerminalTab["state"],
          projectId: s.projectId,
          summary: s.summary,
          poker: (s as Record<string, unknown>).poker ? true : undefined,
          cwd: (s as Record<string, unknown>).cwd as string | undefined,
          startedAt: (s as Record<string, unknown>).startedAt as string | undefined,
          agentType: (s as Record<string, unknown>).agentType as string | undefined,
          source: (s as Record<string, unknown>).source as string | undefined,
          forkedFrom: (s as Record<string, unknown>).forkedFrom as string | undefined,
        }));
      const savedOrder: string[] = (() => {
        if (isRemote) return [];
        try { return JSON.parse(settings["terminal.tabOrder"] ?? "[]"); }
        catch { return []; }
      })();
      if (savedOrder.length > 0 && restored.length > 0) {
        const byId = new Map(restored.map((t) => [t.id, t]));
        const ordered: TerminalTab[] = [];
        for (const id of savedOrder) {
          const tab = byId.get(id);
          if (tab) { ordered.push(tab); byId.delete(id); }
        }
        for (const tab of byId.values()) ordered.push(tab);
        setAllTabs(ordered);
      } else {
        setAllTabs(restored);
      }
      attachedSessions.current = new Set(restored.map((t) => t.id));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [remoteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for label/state updates + discover new remote sessions
  useEffect(() => {
    const isRemoteNow = !!getRemoteOrchard().httpUrl;

    const interval = setInterval(() => {
      // When viewing remote, re-fetch the full session list to discover new sessions
      if (isRemoteNow) {
        api.listTerminals().then((sessions) => {
          const fresh: TerminalTab[] = sessions
            .filter((s) => s.exitCode == null)
            .map((s) => ({
              id: s.id,
              label: s.label ?? labelForCommand(s.command),
              command: s.command,
              nickname: randomWord(),
              exitCode: s.exitCode,
              state: s.state as TerminalTab["state"],
              projectId: s.projectId,
              summary: s.summary,
              cwd: (s as Record<string, unknown>).cwd as string | undefined,
              agentType: (s as Record<string, unknown>).agentType as string | undefined,
            }));
          setAllTabs((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const novel = fresh.filter((t) => !existingIds.has(t.id));
            // Also remove tabs for sessions that no longer exist
            const freshIds = new Set(fresh.map((t) => t.id));
            const stillAlive = prev.filter((t) => freshIds.has(t.id));
            return novel.length > 0 || stillAlive.length < prev.length
              ? [...stillAlive, ...novel]
              : prev;
          });
        }).catch(() => {});
        return;
      }

      // Local: poll individual sessions for updates
      for (const tab of allTabs) {
        if (tab.exitCode !== undefined && tab.label && tab.summary) continue;
        api.getTerminal(tab.id).then((info) => {
          const updates: Partial<TerminalTab> = {};
          if (info.label && info.label !== tab.label) updates.label = info.label;
          if (info.state && info.state !== tab.state) updates.state = info.state as TerminalTab["state"];
          if (info.summary && info.summary !== tab.summary) updates.summary = info.summary;
          if (info.forkedFrom && !tab.forkedFrom) updates.forkedFrom = info.forkedFrom;
          if (info.exitCode !== undefined && tab.exitCode == null) updates.exitCode = info.exitCode;
          if (updates.label || updates.summary) updates.lastAiUpdate = Date.now();
          if (Object.keys(updates).length > 0) {
            setAllTabs((prev) =>
              prev.map((t) => (t.id === tab.id ? { ...t, ...updates } : t)),
            );
          }
        }).catch(() => {});
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [allTabs]);

  // Poll for remote mesh sessions (runs independently of local session restore)
  useEffect(() => {
    let cancelled = false;
    const fetchMesh = () => {
      api.meshSessions().then((mesh) => {
        if (cancelled || !mesh?.sessions?.length) return;
        const remoteTabs: TerminalTab[] = mesh.sessions.map((s) => ({
          id: s.id,
          label: s.label ?? labelForCommand(s.command),
          command: s.command,
          nickname: randomWord(),
          exitCode: s.exit_code,
          state: s.state as TerminalTab["state"],
          projectId: s.project_id,
          node: s.node,
        }));
        setAllTabs((prev) => {
          const localIds = new Set(prev.filter((t) => !t.node).map((t) => t.id));
          // Replace all remote tabs with fresh data, keep local tabs untouched
          const local = prev.filter((t) => !t.node);
          const novel = remoteTabs.filter((t) => !localIds.has(t.id));
          return novel.length > 0 ? [...local, ...novel] : local.length < prev.length ? local : prev;
        });
      }).catch(() => {});
    };
    fetchMesh();
    const interval = setInterval(fetchMesh, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Phoenix channel real-time updates (flat events, filter by payload.id)
  const { channel: dashChannel } = useChannel("dashboard");
  const stateEvent = useChannelEvent<{ id: string; state: string }>(dashChannel, "session:state");
  const labelEvent = useChannelEvent<{ id: string; label: string }>(dashChannel, "session:label");
  const summaryEvent = useChannelEvent<{ id: string; summary: string }>(dashChannel, "session:summary");
  const pokerEvent = useChannelEvent<{ id: string; enabled: boolean }>(dashChannel, "session:poker");
  const pokerFiredEvent = useChannelEvent<{ id: string }>(dashChannel, "session:poker_fired");
  const profiledEvent = useChannelEvent<{ profiles: Record<string, SessionProfile> }>(dashChannel, "session:profiled");

  const activeIds = useMemo(() => new Set(allTabs.filter((t) => t.exitCode == null).map((t) => t.id)), [allTabs]);

  useEffect(() => {
    if (!stateEvent || !activeIds.has(stateEvent.id)) return;
    setAllTabs((prev) =>
      prev.map((t) => (t.id === stateEvent.id ? { ...t, state: stateEvent.state as TerminalTab["state"] } : t)),
    );
  }, [stateEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!labelEvent || !activeIds.has(labelEvent.id)) return;
    setAllTabs((prev) =>
      prev.map((t) => (t.id === labelEvent.id ? { ...t, label: labelEvent.label, lastAiUpdate: Date.now() } : t)),
    );
  }, [labelEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!summaryEvent || !activeIds.has(summaryEvent.id)) return;
    setAllTabs((prev) =>
      prev.map((t) => (t.id === summaryEvent.id ? { ...t, summary: summaryEvent.summary, lastAiUpdate: Date.now() } : t)),
    );
  }, [summaryEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pokerEvent || !activeIds.has(pokerEvent.id)) return;
    setAllTabs((prev) =>
      prev.map((t) => (t.id === pokerEvent.id ? { ...t, poker: pokerEvent.enabled || undefined } : t)),
    );
  }, [pokerEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pokerFiredEvent || !activeIds.has(pokerFiredEvent.id)) return;
    setAllTabs((prev) =>
      prev.map((t) => (t.id === pokerFiredEvent.id ? { ...t, lastPokerFired: Date.now() } : t)),
    );
    setTimeout(() => {
      setAllTabs((prev) =>
        prev.map((t) => (t.id === pokerFiredEvent.id ? { ...t, lastPokerFired: undefined } : t)),
      );
    }, 2000);
  }, [pokerFiredEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Profile updates from the Profiler GenServer (every 30s)
  useEffect(() => {
    if (!profiledEvent) return;
    setProfiles(profiledEvent.profiles);
  }, [profiledEvent]);

  // Load initial profiles on mount
  useEffect(() => {
    api.getTerminalProfiles().then((data) => {
      if (data?.profiles) setProfiles(data.profiles as Record<string, SessionProfile>);
    }).catch(() => {});
  }, []);

  const spawn = useCallback(async (command: string, args: string[], label: string) => {
    const result = await api.spawnTerminal(command, args, defaultCwd, activeProjectId);
    const tab: TerminalTab = { id: result.id, label, command, nickname: randomWord(), projectId: activeProjectId };
    setAllTabs((prev) => {
      if (prev.some((t) => t.id === tab.id)) return prev;
      return [...prev, tab];
    });
    // Poll once after 3s to pick up initial async-generated label
    setTimeout(() => {
      api.getTerminal(result.id).then((info) => {
        if (info.label) {
          setAllTabs((prev) =>
            prev.map((t) => (t.id === result.id ? { ...t, label: info.label! } : t)),
          );
        }
      }).catch(() => {});
    }, 3000);
    return tab;
  }, [defaultCwd, activeProjectId]);

  const kill = useCallback(async (sessionId: string) => {
    api.killTerminal(sessionId).catch(() => {});
    setAllTabs((prev) => prev.filter((t) => t.id !== sessionId));
  }, []);

  const handleExit = useCallback((sessionId: string, code: number) => {
    setAllTabs((prev) =>
      prev.map((t) => (t.id === sessionId ? { ...t, exitCode: code } : t)),
    );
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setAllTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "terminal.tabOrder": JSON.stringify(next.map((t) => t.id)) }),
      }).catch(() => {});
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    setRemoteKey((k) => k + 1);
  }, []);

  return { tabs, allTabs, profiles, spawn, kill, handleExit, reorder, refresh };
}
