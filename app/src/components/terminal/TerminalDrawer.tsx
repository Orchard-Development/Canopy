import { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TerminalIcon from "@mui/icons-material/Terminal";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CodeIcon from "@mui/icons-material/Code";
import { api, onRemoteOrchardChange } from "../../lib/api";
import { useActiveProject } from "../../hooks/useActiveProject";
import { useDefaultCwd } from "../../lib/use-default-cwd";
import { randomWord } from "../../lib/random-word";
import { TerminalDrawerContent, type TerminalTab } from "./TerminalDrawerContent";
import type { SessionProfile } from "./ProfileTooltip";
import type { GridSpan } from "../ResizableGrid";
import { ResizableDrawer } from "../ResizableDrawer";
import { useChannelEvent } from "../../hooks/useChannelEvent";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";
import { OrchardIcon } from "./OrchardIcon";
import { OrchardModelPicker } from "./OrchardModelPicker";

const ORCHARD_PRESET = "Orchard";

const PRESETS = [
  { label: "Claude Code", command: "claude", args: ["--dangerously-skip-permissions"], icon: <SmartToyIcon /> },
  { label: "Codex", command: "codex", args: ["--full-auto"], icon: <CodeIcon /> },
  { label: ORCHARD_PRESET, command: "opencode", args: [] as string[], icon: <OrchardIcon /> },
  { label: "Shell", command: "", args: [] as string[], icon: <TerminalIcon /> },
];

function defaultShell(): string {
  return navigator.platform?.toLowerCase().includes("win") ? "powershell.exe" : "/bin/zsh";
}

function labelForCommand(cmd: string): string {
  if (!cmd || cmd === defaultShell() || cmd.endsWith("/zsh") || cmd.endsWith("/bash")) return "Shell";
  const base = cmd.split("/").pop() ?? cmd;
  const labels: Record<string, string> = { claude: "Claude Code", codex: "Codex", opencode: "Orchard" };
  return labels[base] ?? base;
}

export interface TerminalDrawerHandle {
  attachSession: (sessionId: string, label: string) => void;
  isSessionActive: (sessionId: string) => boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  highlight?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const TerminalDrawer = forwardRef<TerminalDrawerHandle, Props>(function TerminalDrawer(
  { open, onClose, highlight, onExpandedChange },
  ref,
) {
  const navigate = useNavigate();
  const [glowing, setGlowing] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!highlight || !open) return;
    setGlowing(true);
    const timer = setTimeout(() => setGlowing(false), 3000);
    return () => clearTimeout(timer);
  }, [highlight, open]);

  const [allTabs, setAllTabs] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTabRaw] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const attachedSessions = useRef(new Set<string>());
  const skipFocusSyncRef = useRef(false);
  const [scrollToSessionId, setScrollToSessionId] = useState<string | null>(null);
  const [gridMode, setGridModeRaw] = useState(false);
  const [gridSpans, setGridSpansRaw] = useState<Record<string, GridSpan>>({});
  const [freeformGrid, setFreeformGridRaw] = useState(false);
  const [expanded, setExpandedRaw] = useState(false);
  const defaultCwd = useDefaultCwd();
  const { project: activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id;

  const [projectFilterEnabled, setProjectFilterEnabledRaw] = useState(true);

  const setProjectFilterEnabled = useCallback((next: boolean) => {
    setProjectFilterEnabledRaw(next);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.projectFilter": String(next) }),
    }).catch(() => {});
  }, []);

  const tabs = useMemo(
    () => projectFilterEnabled
      ? allTabs.filter((t) => !t.projectId || !activeProjectId || t.projectId === activeProjectId)
      : allTabs,
    [allTabs, activeProjectId, projectFilterEnabled],
  );

  useEffect(() => {
    setActiveTabRaw(0);
  }, [activeProjectId]);

  const setTabs = useCallback((updater: TerminalTab[] | ((prev: TerminalTab[]) => TerminalTab[])) => {
    setAllTabs((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next === prev) return prev;
      // Auto-deduplicate by session ID to prevent race conditions
      // between channel events, DOM events, and REST callbacks
      const seen = new Set<string>();
      return next.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    });
  }, []);

  const persistFocusedId = useCallback((id: string) => {
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.lastFocusedId": id }),
    }).catch(() => {});
  }, []);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const pendingFocusSync = useRef(false);
  const prevOpen = useRef(open);
  const mountedRef = useRef(false);
  useEffect(() => {
    // Skip the first render cycle -- the restore effect handles initial focus
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevOpen.current = open;
      return;
    }
    if (open && !prevOpen.current) pendingFocusSync.current = true;
    prevOpen.current = open;
    if (!open || !pendingFocusSync.current || tabs.length === 0) return;
    // Skip focus restore when a dispatch just attached a session
    if (skipFocusSyncRef.current) {
      pendingFocusSync.current = false;
      skipFocusSyncRef.current = false;
      return;
    }
    pendingFocusSync.current = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        // Double-check: a dispatch may have fired while the fetch was in-flight
        if (skipFocusSyncRef.current) {
          skipFocusSyncRef.current = false;
          return;
        }
        const focusedId = data["terminal.lastFocusedId"];
        if (!focusedId) return;
        const idx = tabs.findIndex((t) => t.id === focusedId);
        if (idx >= 0) setActiveTab(idx);
      })
      .catch(() => {});
  }, [open, tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveTab = useCallback((next: number | ((p: number) => number)) => {
    setActiveTabRaw((prev) => {
      const val = typeof next === "function" ? next(prev) : next;
      const focused = tabsRef.current[val];
      const settings: Record<string, string> = { "terminal.activeTab": String(val) };
      if (focused) settings["terminal.lastFocusedId"] = focused.id;
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      }).catch(() => {});
      return val;
    });
  }, []);

  const setGridMode = useCallback((next: boolean) => {
    setGridModeRaw(next);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.gridMode": String(next) }),
    }).catch(() => {});
  }, []);

  const setGridSpans = useCallback((spans: Record<string, GridSpan>) => {
    setGridSpansRaw(spans);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.gridSpans": JSON.stringify(spans) }),
    }).catch(() => {});
  }, []);

  const setFreeformGrid = useCallback((next: boolean) => {
    setFreeformGridRaw(next);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.freeformGrid": String(next) }),
    }).catch(() => {});
  }, []);

  const onExpandedChangeRef = useRef(onExpandedChange);
  onExpandedChangeRef.current = onExpandedChange;

  const setExpanded = useCallback((next: boolean) => {
    setExpandedRaw(next);
    onExpandedChangeRef.current?.(next);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "terminal.expanded": String(next) }),
    }).catch(() => {});
  }, []);

  // Restore sessions and settings on mount
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const applySettings = (settings: Record<string, string>) => {
      if (settings["terminal.gridMode"] !== undefined) {
        setGridModeRaw(settings["terminal.gridMode"] === "true");
      }
      if (settings["terminal.freeformGrid"] === "true") {
        setFreeformGridRaw(true);
      }
      if (settings["terminal.expanded"] === "true") {
        setExpandedRaw(true);
        onExpandedChangeRef.current?.(true);
      }
      if (settings["terminal.projectFilter"] !== undefined) {
        setProjectFilterEnabledRaw(settings["terminal.projectFilter"] !== "false");
      }
      try {
        const spans = JSON.parse(settings["terminal.gridSpans"] ?? "{}");
        if (spans && typeof spans === "object") setGridSpansRaw(spans);
      } catch { /* ignore */ }
    };

    const applySessions = (sessions: Array<{ id: string; label?: string; command: string; exitCode?: number; state?: string; projectId?: string; summary?: string; cwd?: string; startedAt?: string; agentType?: string; source?: string; forkedFrom?: string }>, settings: Record<string, string>) => {
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
          cwd: s.cwd,
          startedAt: s.startedAt,
          agentType: s.agentType,
          source: s.source,
          forkedFrom: s.forkedFrom,
        }));
      if (restored.length === 0) return;
      setTabs(restored);
      for (const t of restored) attachedSessions.current.add(t.id);
      const focusedId = settings["terminal.lastFocusedId"];
      const idIdx = focusedId ? restored.findIndex((t) => t.id === focusedId) : -1;
      if (idIdx >= 0) {
        setActiveTabRaw(idIdx);
      } else {
        const saved = parseInt(settings["terminal.activeTab"], 10);
        if (!isNaN(saved) && saved >= 0 && saved < restored.length) {
          setActiveTabRaw(saved);
        }
      }
    };

    Promise.all([
      api.listTerminals(),
      fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
    ]).then(([sessions, settings]) => {
      if (cancelled) return;
      applySettings(settings);
      if (sessions.length > 0) {
        applySessions(sessions, settings);
      } else {
        // Engine may still be restoring sessions -- retry once after a short delay
        retryTimer = setTimeout(() => {
          if (cancelled) return;
          api.listTerminals().then((retried) => {
            if (cancelled || retried.length === 0) return;
            applySessions(retried, settings);
          }).catch(() => {});
        }, 1500);
      }
    }).catch(() => {});
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    isSessionActive(sessionId: string) {
      return attachedSessions.current.has(sessionId);
    },
    attachSession(sessionId: string, label: string) {
      // Always scroll to the session (even if already attached)
      setScrollToSessionId(sessionId);
      setTimeout(() => setScrollToSessionId(null), 100);

      if (attachedSessions.current.has(sessionId)) {
        // Session already exists -- just focus it
        const filtered = tabsRef.current.filter((t) =>
          !t.projectId || !activeProjectId || t.projectId === activeProjectId,
        );
        const idx = filtered.findIndex((t) => t.id === sessionId);
        if (idx >= 0) setActiveTabRaw(idx);
        persistFocusedId(sessionId);
        return;
      }
      attachedSessions.current.add(sessionId);
      // Prevent focus-sync from overriding the active tab for this dispatch
      skipFocusSyncRef.current = true;
      setTabs((prev) => {
        const existing = prev.findIndex((t) => t.id === sessionId);
        if (existing >= 0) {
          const filtered = prev.filter((t) =>
            !t.projectId || !activeProjectId || t.projectId === activeProjectId,
          );
          const filteredIdx = filtered.findIndex((t) => t.id === sessionId);
          if (filteredIdx >= 0) setActiveTabRaw(filteredIdx);
          return prev;
        }
        const newTab: TerminalTab = { id: sessionId, label, command: label, nickname: randomWord(), projectId: activeProjectId };
        const filtered = prev.filter((t) =>
          !t.projectId || !activeProjectId || t.projectId === activeProjectId,
        );
        setActiveTabRaw(filtered.length);
        return [...prev, newTab];
      });
      // Persist so future focus-sync restores this session
      persistFocusedId(sessionId);
    },
  }));

  useEffect(() => {
    if (allTabs.length === 0) return;
    const interval = setInterval(() => {
      for (const tab of allTabs) {
        // Skip exited sessions that already have both label and summary
        if (tab.exitCode !== undefined && tab.label && tab.summary) continue;
        api.getTerminal(tab.id).then((info) => {
          const updates: Partial<TerminalTab> = {};
          if (info.label && info.label !== tab.label) updates.label = info.label;
          if (info.state && info.state !== tab.state) updates.state = info.state as TerminalTab["state"];
          if (info.summary && info.summary !== tab.summary) updates.summary = info.summary;
          if (info.cwd && !tab.cwd) updates.cwd = info.cwd;
          if (info.startedAt && !tab.startedAt) updates.startedAt = info.startedAt;
          if (info.agentType && !tab.agentType) updates.agentType = info.agentType;
          if (info.source && !tab.source) updates.source = info.source;
          if (info.forkedFrom && !tab.forkedFrom) updates.forkedFrom = info.forkedFrom;
          if (info.exitCode !== undefined && tab.exitCode === undefined) updates.exitCode = info.exitCode;
          if (updates.label || updates.summary) updates.lastAiUpdate = Date.now();
          if (Object.keys(updates).length > 0) {
            setTabs((prev) =>
              prev.map((t) => (t.id === tab.id ? { ...t, ...updates } : t)),
            );
          }
        }).catch((err) => {
          // Session no longer exists on the server -- remove the dead tab
          if (err?.message?.includes("404")) {
            setTabs((prev) => prev.filter((t) => t.id !== tab.id));
            attachedSessions.current.delete(tab.id);
          }
        });
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [allTabs]);

  // Phoenix channel real-time updates (flat events, filter by payload.id)
  const [profiles, setProfiles] = useState<Record<string, SessionProfile>>({});
  const { channel: dashChannel } = useDashboardChannel();
  const stateEvent = useChannelEvent<{ id: string; state: string }>(dashChannel, "session:state");
  const labelEvent = useChannelEvent<{ id: string; label: string }>(dashChannel, "session:label");
  const summaryEvent = useChannelEvent<{ id: string; summary: string }>(dashChannel, "session:summary");
  const exitedEvent = useChannelEvent<{ id: string; exitCode: number }>(dashChannel, "session:exited");
  const profiledEvent = useChannelEvent<{ profiles: Record<string, SessionProfile> }>(dashChannel, "session:profiled");

  // Profile updates from the Profiler GenServer (every 30s)
  useEffect(() => {
    if (!profiledEvent) return;
    setProfiles(profiledEvent.profiles);
  }, [profiledEvent]);

  // Load initial profiles
  useEffect(() => {
    api.getTerminalProfiles().then((data) => {
      if (data?.profiles) setProfiles(data.profiles as Record<string, SessionProfile>);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stateEvent) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === stateEvent.id ? { ...t, state: stateEvent.state as TerminalTab["state"] } : t)),
    );
  }, [stateEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!labelEvent) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === labelEvent.id ? { ...t, label: labelEvent.label, lastAiUpdate: Date.now() } : t)),
    );
  }, [labelEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!summaryEvent) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === summaryEvent.id ? { ...t, summary: summaryEvent.summary, lastAiUpdate: Date.now() } : t)),
    );
  }, [summaryEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!exitedEvent) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === exitedEvent.id ? { ...t, exitCode: exitedEvent.exitCode ?? 0 } : t)),
    );
  }, [exitedEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const spawnAndAttach = useCallback(async (result: { id: string }, label: string, command: string) => {
    attachedSessions.current.add(result.id);
    const tab: TerminalTab = { id: result.id, label, command, nickname: randomWord(), projectId: activeProjectId };
    setTabs((prev) => {
      const filtered = prev.filter((t) =>
        !t.projectId || !activeProjectId || t.projectId === activeProjectId,
      );
      setActiveTab(filtered.length);
      return [...prev, tab];
    });
    setTimeout(() => {
      api.getTerminal(result.id).then((info) => {
        if (info.label) {
          setTabs((prev) =>
            prev.map((t) => (t.id === result.id ? { ...t, label: info.label! } : t)),
          );
        }
      }).catch(() => {});
    }, 3000);
  }, [activeProjectId]);

  const handleSpawn = useCallback(async (command: string, args: string[], label: string) => {
    setMenuAnchor(null);
    if (label === ORCHARD_PRESET) {
      setModelPickerOpen(true);
      return;
    }
    const result = await api.spawnTerminal(command, args, defaultCwd, activeProjectId);
    spawnAndAttach(result, label, command);
  }, [defaultCwd, activeProjectId, spawnAndAttach]);

  const handleOrchardModelSelect = useCallback(async (modelId: string) => {
    setModelPickerOpen(false);
    const modelName = modelId.split("/").pop() ?? modelId;
    const label = `Orchard (${modelName})`;
    const result = await api.spawnOrchardTerminal(modelId, defaultCwd, activeProjectId);
    spawnAndAttach(result, label, "opencode");
  }, [defaultCwd, activeProjectId, spawnAndAttach]);

  const handleClose = useCallback(
    async (index: number) => {
      const tab = tabs[index];
      if (!tab) return;
      api.killTerminal(tab.id).catch(() => {});
      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      setActiveTabRaw((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    },
    [tabs],
  );

  const handleExit = useCallback((index: number, code: number) => {
    const tab = tabs[index];
    if (!tab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, exitCode: code } : t)),
    );
  }, [tabs]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    console.log("[handleReorder] called", { fromIndex, toIndex });
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      console.log("[handleReorder] prev ids:", prev.map((t) => t.id));
      console.log("[handleReorder] next ids:", next.map((t) => t.id));
      return next;
    });
  }, []);

  const handleCardFocus = useCallback((id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx >= 0) setActiveTab(idx);
  }, [tabs, setActiveTab]);

  const handleViewLog = useCallback((sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  }, [navigate]);

  const handleOpenLogFile = useCallback((sessionId: string) => {
    window.open(`/api/session-logs/${sessionId}/stream`, "_blank");
  }, []);

  const handleAiSync = useCallback((id: string, updates: { label?: string; summary?: string; lastAiUpdate?: number }) => {
    if (Object.keys(updates).length === 0) return;
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const handleRefresh = useCallback(() => {
    api.listTerminals().then((sessions) => {
      const restored: TerminalTab[] = sessions
        .filter((s) => s.exitCode == null)
        .map((s) => ({
          id: s.id,
          label: s.label ?? labelForCommand(s.command),
          command: s.command,
          nickname: randomWord(),
          exitCode: s.exitCode ?? undefined,
          state: s.state as TerminalTab["state"],
          projectId: s.projectId,
          summary: s.summary,
          cwd: (s as Record<string, unknown>).cwd as string | undefined,
          agentType: (s as Record<string, unknown>).agentType as string | undefined,
        }));
      setTabs((prev) => {
        // Non-disruptive: merge new sessions, keep existing ones stable
        const existingIds = new Set(prev.map((t) => t.id));
        const freshIds = new Set(restored.map((t) => t.id));
        const kept = prev.filter((t) => freshIds.has(t.id));
        const novel = restored.filter((t) => !existingIds.has(t.id));
        if (novel.length === 0 && kept.length === prev.length) return prev;
        return [...kept, ...novel];
      });
      for (const t of restored) attachedSessions.current.add(t.id);
    }).catch(() => {});
  }, []);

  // Auto-refresh every 1s when no sessions are visible
  useEffect(() => {
    if (tabs.length > 0) return;
    const interval = setInterval(handleRefresh, 1000);
    return () => clearInterval(interval);
  }, [tabs.length, handleRefresh]);

  // Refresh immediately on remote orchard switch, then again after 1s
  useEffect(() => {
    return onRemoteOrchardChange(() => {
      handleRefresh();
      const t = setTimeout(handleRefresh, 1000);
      return () => clearTimeout(t);
    });
  }, [handleRefresh]);

  return (
    <ResizableDrawer
      open={open}
      side="right"
      settingsPrefix="terminal"
      defaultWidth={520}
      minWidth={360}
      maxWidthRatio={0.85}
      expanded={expanded}
      glow={glowing}
      onDraggingChange={setDragging}
    >
      <TerminalDrawerContent
        activeTab={activeTab}
        drawerDragging={dragging}
        expanded={expanded}
        freeformGrid={freeformGrid}
        gridMode={gridMode}
        gridSpans={gridSpans}
        menuAnchor={menuAnchor}
        open={open}
        presets={PRESETS}
        profiles={profiles}
        setActiveTab={setActiveTab}
        setExpanded={setExpanded}
        setFreeformGrid={setFreeformGrid}
        setGridMode={setGridMode}
        setGridSpans={setGridSpans}
        setMenuAnchor={setMenuAnchor}
        tabs={tabs}
        onClose={onClose}
        onExit={handleExit}
        onSpawn={handleSpawn}
        onCardFocus={handleCardFocus}
        onTabClose={handleClose}
        onReorder={handleReorder}
        onViewLog={handleViewLog}
        onOpenLogFile={handleOpenLogFile}
        onAiSync={handleAiSync}
        onRefresh={handleRefresh}
        projectCwd={defaultCwd}
        projectFilterEnabled={projectFilterEnabled}
        setProjectFilterEnabled={setProjectFilterEnabled}
        hasActiveProject={!!activeProjectId}
        scrollToSessionId={scrollToSessionId}
      />
      <OrchardModelPicker
        open={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        onSelect={handleOrchardModelSelect}
      />
    </ResizableDrawer>
  );
});
