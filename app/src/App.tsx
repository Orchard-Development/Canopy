import { useState, useRef, useMemo, useEffect, useCallback, useContext, Suspense, lazy } from "react";
import { Routes, Route, useSearchParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline, Box, CircularProgress, useMediaQuery, useTheme, Button } from "@mui/material";
import { buildThemes, getInitialMode } from "./lib/theme";
import { BrandingContext, SetBrandingContext, DEFAULT_BRANDING, fetchBranding, type BrandingConfig } from "./lib/branding";
import { ColorModeContext } from "./hooks/useColorMode";
import { useChannelEvent } from "./hooks/useChannelEvent";
import { DashboardChannelProvider } from "@/contexts/DashboardChannelContext";
import { MonitorChannelProvider } from "@/contexts/MonitorChannelContext";
import { useDashboardChannel } from "@/hooks/useDashboardChannel";
import { EVENTS } from "./lib/events";
import { supabase } from "./lib/supabase";
import { ProjectProvider } from "./hooks/useProject";
import { ActiveProjectProvider } from "./hooks/useActiveProject";
import { AppHeader } from "./components/AppHeader";
import { NavDrawer } from "./components/NavDrawer";
import { TerminalDrawer, type TerminalDrawerHandle } from "./components/terminal/TerminalDrawer";
import { MediaFab } from "./components/media/MediaFab";
import { TerminalActionFab } from "./components/terminal/TerminalActionFab";
import { TerminalActionModal } from "./components/terminal/TerminalActionModal";
import { ProposalFabModal } from "./components/proposal/ProposalFabModal";
import { usePreviewEntries } from "./hooks/usePreviewEntries";
import { useTerminalActions } from "./hooks/useTerminalActions";
import { useProposals } from "./hooks/useProposals";
import { useTunnelConnections } from "./hooks/useTunnelConnections";
import { useViewRegistry } from "./hooks/useViewRegistry";
import { COMPONENT_MAP } from "./views/registry";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GuidedTour } from "./components/GuidedTour";
import { RecentSessionsModal } from "./components/sessions/RecentSessionsModal";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useCloudSync } from "./hooks/useCloudSync";
import { LoginGate } from "./components/settings/LoginGate";
import { TunnelAuthProvider } from "./hooks/useTunnelAuth";
import { TunnelPinModal } from "./components/tunnel/TunnelPinModal";
import { TunnelAuthFab } from "./components/tunnel/TunnelAuthFab";
import { TunnelAuthModal } from "./components/tunnel/TunnelAuthModal";
import { AccessRequestModal } from "./components/tunnel/AccessRequestModal";
import { useAccessRequests } from "./hooks/useAccessRequests";
import { DevModeContext, useDevModeProvider } from "./hooks/useDevMode";
import { AddViewPicker } from "./components/AddViewPicker";
import { useActiveProject } from "./hooks/useActiveProject";
import { useToastProvider, ToastProvider, useToast } from "./hooks/useToast";
import { useEventBusProvider, EventBusProvider, useEventBus } from "./hooks/useEventBus";
import { SettingsProvider, useSettingsContext } from "./contexts/SettingsContext";
import { fetchSettings } from "./lib/settingsCache";
import { useEngineEvents } from "./hooks/useEngineEvents";
import { useCollabApproval } from "./hooks/useCollabApproval";
import { CollabApprovalDialog } from "./components/collab/CollabApprovalDialog";
import { useNotificationHydration } from "./hooks/useNotificationHydration";
import { useUserActivity } from "./hooks/useUserActivity";
import { ProjectThemeBridge } from "./components/ProjectThemeBridge";
import { ToastHost } from "./components/ToastHost";

/**
 * Wraps React.lazy with automatic retry on chunk-load failure.
 * Handles Vite HMR chunk invalidation and network errors gracefully.
 */
function lazyWithRetry(
  factory: () => Promise<{ default: React.ComponentType<any> }>
) {
  return lazy(() =>
    factory().catch((error) => {
      console.warn("[lazyWithRetry] Chunk load failed, retrying:", error);
      return new Promise<{ default: React.ComponentType<any> }>((resolve) =>
        setTimeout(() => resolve(factory()), 1500)
      );
    })
  );
}

const Onboarding = lazyWithRetry(() => import("./views/Onboarding"));

/**
 * Bridge: wraps children in ToastProvider, consuming events from EventBus.
 * Must be rendered inside EventBusProvider.
 */
function ToastProviderBridge({ children }: { children: React.ReactNode }) {
  const toastState = useToastProvider();
  return (
    <ToastProvider value={toastState.api}>
      {children}
      <ToastHost visible={toastState.visible} onDismiss={toastState.api.dismiss} />
    </ToastProvider>
  );
}

/** Placeholder so the old ToastHostBridge slot renders nothing (toast host is inside ToastProviderBridge now). */
function ToastHostBridge() {
  return null;
}
import type { PendingSession } from "./views/Onboarding";
const CreateProject = lazyWithRetry(() => import("./views/CreateProject"));
const Feed = lazyWithRetry(() => import("./views/Feed"));
const ProjectApprovals = lazyWithRetry(() => import("./views/Approvals"));
const ProposalDetail = lazyWithRetry(() => import("./views/ProposalDetail"));
const TerminalFocus = lazyWithRetry(() => import("./views/TerminalFocus"));
const SessionLogDetail = lazyWithRetry(() => import("./views/SessionLogDetail"));
const SeedPackDetail = lazyWithRetry(() => import("./views/SeedPackDetail"));
const ProjectDetail = lazyWithRetry(() => import("./views/ProjectDetail"));
const Settings = lazyWithRetry(() => import("./views/Settings"));
const Mesh = lazyWithRetry(() => import("./views/Mesh"));

function ViewFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <CircularProgress />
    </Box>
  );
}

/** Restores the last visited route on cold start. Falls back to /workspace if a project is active, /ai otherwise. */
function RestoreRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const { settings } = useSettingsContext();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    Promise.all([
      import("./hooks/useNavHistory").then(({ fetchNavState }) => fetchNavState()),
      // Use already-loaded context settings if available, otherwise fetch directly
      // to avoid blocking on the context load race during cold start.
      Object.keys(settingsRef.current).length > 0
        ? Promise.resolve(settingsRef.current)
        : fetchSettings().catch(() => ({})),
    ]).then(([{ current }, resolvedSettings]) => {
      const hasActiveProject = !!(resolvedSettings as Record<string, string>).active_project;
      const fallback = hasActiveProject ? "/workspace" : "/ai";
      const target = current?.path ? current.path + (current.search ?? "") : fallback;
      // Only navigate if the target is a real route (not the catch-all we're on)
      if (target !== location.pathname) {
        navigate(target, { replace: true });
      } else {
        navigate(fallback, { replace: true });
      }
      setReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <ViewFallback />;
  return null;
}

/** Catches /terminal?session=...&label=... navigations, opens the drawer, and redirects back. */
function TerminalRedirect({ onOpen, onToggle }: { onOpen: (id: string, label: string) => void; onToggle: () => void }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const sessionId = searchParams.get("session");
    const label = searchParams.get("label") ?? "Session";
    if (sessionId) {
      onOpen(sessionId, label);
    } else {
      onToggle();
    }
    navigate("/", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function persistSetting(key: string, value: string): void {
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: value }),
  }).catch(() => {});
}

function AppLayout({ onResetOnboarding, onResetTour, showTour, onTourComplete, pendingSession }: { onResetOnboarding: () => void; onResetTour: () => void; showTour: boolean; onTourComplete: () => void; pendingSession?: PendingSession | null }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { views: dynamicViews, loading: viewsLoading } = useViewRegistry();
  const { project: activeProject } = useActiveProject();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [addViewOpen, setAddViewOpen] = useState(false);
  const isOnTerminalsPage = location.pathname.startsWith("/terminals");
  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const prevPathname = useRef(location.pathname);
  const terminalRef = useRef<TerminalDrawerHandle>(null);
  const { entries: previewEntries, unseenCount, shaking, markSeen } = usePreviewEntries();
  const { actions: terminalActions, completeAction } = useTerminalActions();
  const { proposals, lastCreated: proposalLastCreated, dismissLastCreated: dismissProposalToast } = useProposals();
  const { connections: tunnelConnections, approve: approveTunnel, deny: denyTunnel } = useTunnelConnections();
  const { requests: accessRequests, dismiss: dismissAccessRequest } = useAccessRequests();
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false); // kept for ProposalFabModal
  const [tunnelAuthModalOpen, setTunnelAuthModalOpen] = useState(false);
  const [accessRequestModalOpen, setAccessRequestModalOpen] = useState(false);
  const { settings: appLayoutSettings } = useSettingsContext();
  const terminalOpenRestoredRef = useRef(false);

  // Auto-open tunnel auth modal when a connection request arrives
  useEffect(() => {
    if (tunnelConnections.length > 0) {
      setTunnelAuthModalOpen(true);
    }
  }, [tunnelConnections.length]);

  // Auto-open access request modal when someone requests access
  useEffect(() => {
    if (accessRequests.length > 0) {
      setAccessRequestModalOpen(true);
    }
  }, [accessRequests.length]);

  // Auto-close terminal when navigating away in fullscreen mode;
  // expanded state stays persisted so reopening restores fullscreen
  useEffect(() => {
    const pathChanged = prevPathname.current !== location.pathname;
    prevPathname.current = location.pathname;
    if (pathChanged && terminalExpanded && terminalOpen) {
      setTerminalOpenPersist(false);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore terminal open state from context settings (populated by SettingsContext on mount)
  useEffect(() => {
    if (terminalOpenRestoredRef.current) return;
    if (Object.keys(appLayoutSettings).length === 0) return;
    terminalOpenRestoredRef.current = true;
    if (appLayoutSettings["terminal.open"] === "true") setTerminalOpen(true);
  }, [appLayoutSettings]);

  // Auto-open terminal drawer if a session was handed off from onboarding
  useEffect(() => {
    if (!pendingSession) return;
    const timer = setTimeout(() => {
      setTerminalOpen(true);
      persistSetting("terminal.open", "true");
      setTimeout(() => terminalRef.current?.attachSession(pendingSession.id, pendingSession.label), 100);
    }, 300);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist terminal open state on change
  const setTerminalOpenPersist = useCallback((next: boolean | ((p: boolean) => boolean)) => {
    setTerminalOpen((prev) => {
      const val = typeof next === "function" ? next(prev) : next;
      persistSetting("terminal.open", String(val));
      return val;
    });
  }, []);


  /** Opens the terminal drawer and optionally attaches a session (used by /terminal route redirect). */
  function openTerminalSession(sessionId: string, label: string) {
    setTerminalOpenPersist(true);
    // TerminalDrawer is always mounted so the ref is always valid.
    // Call immediately -- no delay needed, and delaying races with focus-sync.
    terminalRef.current?.attachSession(sessionId, label);
  }

  // Listen for dispatch-originated terminal open requests (DOM + Channel)
  useEffect(() => {
    function handleOpenTerminal(e: Event) {
      const { sessionId, label } = (e as CustomEvent).detail;
      openTerminalSession(sessionId, label);
    }
    window.addEventListener("ctx:open-terminal", handleOpenTerminal);
    return () => window.removeEventListener("ctx:open-terminal", handleOpenTerminal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for toast CTA navigation requests
  useEffect(() => {
    function handleNavigate(e: Event) {
      const { path } = (e as CustomEvent).detail;
      if (path) navigate(path);
    }
    window.addEventListener("ctx:navigate", handleNavigate);
    return () => window.removeEventListener("ctx:navigate", handleNavigate);
  }, [navigate]);

  // Phoenix channel: external dispatchers (CLI, API) request the UI to open a terminal
  const { channel: appDashChannel } = useDashboardChannel();
  const terminalOpenEvent = useChannelEvent<{ sessionId?: string; label?: string }>(appDashChannel, EVENTS.session.open);
  useEffect(() => {
    if (!terminalOpenEvent?.sessionId) return;
    openTerminalSession(terminalOpenEvent.sessionId, terminalOpenEvent.label || "Terminal");
  }, [terminalOpenEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Engine channel events -> EventBus (feeds both toasts and notification bell)
  useEngineEvents(appDashChannel);
  // Agent collaboration approval dialog
  const { current: collabApproval, dismiss: dismissCollabApproval } = useCollabApproval(appDashChannel);

  // Boot hydration: pre-populate EventBus with recent events once the engine exposes the endpoint
  useNotificationHydration();

  // User activity tracking -- captures all in-app interactions
  useUserActivity(appDashChannel);

  // Engine event detection -- listen for channel pushes instead of polling
  const { emit: emitEvent } = useEventBus();

  useEffect(() => {
    if (!appDashChannel) return;

    // Track known IDs to detect "new" events (same logic as before,
    // but triggered by push instead of poll)
    const knownSessionIds = new Set<string>();
    const knownProposalSlugs = new Set<string>();
    let initialized = false;

    // Seed with current state on first join
    fetch("/api/terminal").then(r => r.json()).then((sessions: { id: string }[]) => {
      sessions.forEach(s => knownSessionIds.add(s.id));
      initialized = true;
    }).catch(() => { initialized = true; });

    fetch("/api/proposals").then(r => r.json()).then((proposals: { slug: string }[]) => {
      proposals.forEach(p => knownProposalSlugs.add(p.slug));
    }).catch(() => {});

    // Listen for new sessions
    // Dashboard channel pushes: %{id: id, info: info} (see dashboard_channel.ex:97)
    const sessionRef = appDashChannel.on("session:started", (payload: { id: string; info?: { command?: string; label?: string } }) => {
      if (!initialized || knownSessionIds.has(payload.id)) return;
      knownSessionIds.add(payload.id);
      const cmd = payload.info?.command ?? "";
      const base = cmd.split("/").pop() ?? cmd;
      const label = payload.info?.label || ({ claude: "Claude Code", codex: "Codex" }[base] ?? base) || "Shell";
      emitEvent({
        category: "session",
        event: "dispatched",
        message: `Terminal dispatched: ${label}`,
        severity: "info",
        actionMeta: { type: "focus-session", sessionId: payload.id, label },
      });
    });

    // Listen for new proposals
    // Dashboard channel pushes: %{data: data} (see dashboard_channel.ex:303)
    const proposalRef = appDashChannel.on("proposal:created", (payload: { data: { slug: string; title?: string } }) => {
      const proposal = payload.data;
      if (knownProposalSlugs.has(proposal.slug)) return;
      knownProposalSlugs.add(proposal.slug);
      const label = proposal.title || proposal.slug;
      emitEvent({
        category: "proposal",
        event: "created",
        message: `Proposal ready: ${label}`,
        severity: "success",
        actionMeta: { type: "view-proposal", slug: proposal.slug },
      });
    });

    return () => {
      appDashChannel.off("session:started", sessionRef);
      appDashChannel.off("proposal:created", proposalRef);
    };
  }, [appDashChannel, emitEvent]);

  // Listen for onboarding reset requests from Settings
  useEffect(() => {
    function handleResetOnboarding() { onResetOnboarding(); }
    window.addEventListener("ctx:reset-onboarding", handleResetOnboarding);
    return () => window.removeEventListener("ctx:reset-onboarding", handleResetOnboarding);
  }, [onResetOnboarding]);

  // Listen for tour reset requests from Settings
  useEffect(() => {
    function handleResetTour() { onResetTour(); }
    window.addEventListener("ctx:reset-tour", handleResetTour);
    return () => window.removeEventListener("ctx:reset-tour", handleResetTour);
  }, [onResetTour]);

  return (
    <Box sx={{ display: "flex", height: "100dvh", width: "100vw", overflow: "hidden" }}>
      <AppHeader
        showMenuButton={isMobile}
        onMenuToggle={() => setMobileNavOpen((p) => !p)}
        onFocusSession={openTerminalSession}
        onViewProposal={(slug) => navigate(`/proposals/${slug}`)}
      />
      <NavDrawer
        onTerminalToggle={() => setTerminalOpenPersist((p) => !p)}
        terminalOpen={terminalOpen}
        onAddViewClick={() => setAddViewOpen(true)}
        isMobile={isMobile}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <Box
        component="main"
        sx={{
          display: terminalExpanded && terminalOpen ? "none" : "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          pt: "64px",
          px: isMobile ? 1.5 : 3,
          pb: isMobile ? 1.5 : 3,
        }}
      >
        <Suspense fallback={<ViewFallback />}>
          {viewsLoading ? <ViewFallback /> : (
          <Routes key={dynamicViews.map((v) => v.id).join(",")}>
            <Route path="/" element={<RestoreRoute />} />
            {/* Dynamic views from orchard_views registry */}
            {dynamicViews.map((v) => (
              <Route key={v.id} path={v.path} element={<ErrorBoundary label={v.label}><v.component /></ErrorBoundary>} />
            ))}
            {/* Settings + Mesh -- always routable */}
            <Route path="/settings" element={<ErrorBoundary label="Settings"><Settings /></ErrorBoundary>} />
            <Route path="/mesh" element={<ErrorBoundary label="Mesh"><Mesh /></ErrorBoundary>} />
            {/* Detail routes */}
            <Route path="/proposals/:slug" element={<ErrorBoundary label="Proposal Detail"><ProposalDetail /></ErrorBoundary>} />
            <Route path="/projects/new" element={<ErrorBoundary label="Create Project"><CreateProject /></ErrorBoundary>} />
            <Route path="/projects/:projectId" element={<ProjectProvider><ErrorBoundary label="Project"><ProjectDetail /></ErrorBoundary></ProjectProvider>} />
            <Route path="/projects/:projectId/feed" element={<ProjectProvider><ErrorBoundary label="Feed"><Feed /></ErrorBoundary></ProjectProvider>} />
            <Route path="/projects/:projectId/approvals" element={<ProjectProvider><ErrorBoundary label="Approvals"><ProjectApprovals /></ErrorBoundary></ProjectProvider>} />
            <Route path="/terminal" element={<TerminalRedirect onOpen={openTerminalSession} onToggle={() => setTerminalOpenPersist(true)} />} />
            <Route path="/seed-packs/:id" element={<ErrorBoundary label="Seed Pack Detail"><SeedPackDetail /></ErrorBoundary>} />
            <Route path="/sessions/:id" element={<ErrorBoundary label="Session Log"><SessionLogDetail /></ErrorBoundary>} />
            <Route path="/terminals/:id" element={<ErrorBoundary label="Terminal Focus"><TerminalFocus /></ErrorBoundary>} />
            {/* Catch-all: restore last route or go to first available view */}
            <Route path="*" element={<RestoreRoute />} />
          </Routes>
          )}
        </Suspense>
      </Box>

      <TerminalDrawer ref={terminalRef} open={terminalOpen && !isOnTerminalsPage} onClose={() => setTerminalOpenPersist(false)} highlight={!!pendingSession && terminalOpen} onExpandedChange={setTerminalExpanded} />
      <MediaFab entries={previewEntries} unseenCount={unseenCount} shaking={shaking} onOpen={markSeen} />
      <TerminalActionFab
        count={terminalActions.length}
        hasMediaFab={previewEntries.length > 0}
        hasProposalFab={false}
        onClick={() => setActionModalOpen(true)}
      />
      <TunnelAuthFab
        count={tunnelConnections.length}
        bottomOffset={
          24
          + (previewEntries.length > 0 ? 64 : 0)
          + (terminalActions.length > 0 ? 64 : 0)
        }
        onClick={() => setTunnelAuthModalOpen(true)}
      />
      <TunnelAuthModal
        connections={tunnelConnections}
        open={tunnelAuthModalOpen}
        onClose={() => setTunnelAuthModalOpen(false)}
        onApprove={(id) => { approveTunnel(id); if (tunnelConnections.length <= 1) setTunnelAuthModalOpen(false); }}
        onDeny={(id) => { denyTunnel(id); if (tunnelConnections.length <= 1) setTunnelAuthModalOpen(false); }}
      />
      <AccessRequestModal
        requests={accessRequests}
        open={accessRequestModalOpen}
        onClose={() => setAccessRequestModalOpen(false)}
        onDismiss={(email) => { dismissAccessRequest(email); if (accessRequests.length <= 1) setAccessRequestModalOpen(false); }}
      />
      <CollabApprovalDialog
        request={collabApproval}
        onClose={dismissCollabApproval}
      />
      <TerminalActionModal
        action={terminalActions[0] ?? null}
        open={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onDone={(id) => { completeAction(id); setActionModalOpen(false); }}
      />
      <ProposalFabModal
        proposals={proposals}
        open={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
      />
      {activeProject && (
        <AddViewPicker
          open={addViewOpen}
          onClose={() => setAddViewOpen(false)}
          orchardId={activeProject.id}
        />
      )}
      <GuidedTour
        active={showTour}
        onComplete={onTourComplete}
        onOpenTerminal={() => setTerminalOpenPersist(true)}
        onCloseTerminal={() => setTerminalOpenPersist(false)}
        onEnableGrid={() => window.dispatchEvent(new CustomEvent("ctx:terminal-grid", { detail: { enabled: true } }))}
      />
      <RecentSessionsModal onNavigate={(path) => navigate(path)} />
    </Box>
  );
}

function OnboardingShell({ onComplete, onBrandingChange }: { onComplete: (session?: PendingSession) => void; onBrandingChange: (cfg: BrandingConfig) => void }) {
  return (
    <Suspense fallback={<ViewFallback />}>
      <Onboarding onComplete={onComplete} onBrandingChange={onBrandingChange} />
    </Suspense>
  );
}

/** Handles auto-pull on login and debounced auto-push on branding/settings change. */
function AuthSignoutBridge() {
  const { signOut } = useAuth();
  const { channel } = useDashboardChannel();
  const signoutEvent = useChannelEvent<{ reason: string }>(channel, EVENTS.auth.signout);
  useEffect(() => {
    if (!signoutEvent) return;
    signOut();
  }, [signoutEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Receives refreshed tokens from Engine's TokenRefresher and updates the SDK session.
 *  The SDK's autoRefreshToken is disabled to prevent racing with the Engine
 *  (Supabase refresh tokens are single-use, so dual refreshers cause spurious sign-outs). */
function AuthTokenBridge() {
  const { channel } = useDashboardChannel();
  const tokenEvent = useChannelEvent<{ access_token: string; refresh_token: string }>(
    channel,
    EVENTS.auth.tokenRefreshed,
  );
  useEffect(() => {
    if (!tokenEvent?.access_token || !tokenEvent?.refresh_token) return;
    supabase.auth.setSession({
      access_token: tokenEvent.access_token,
      refresh_token: tokenEvent.refresh_token,
    });
  }, [tokenEvent]);
  return null;
}

function CloudSyncBridge() {
  const { user } = useAuth();
  const { pushToCloud, pullFromCloud } = useCloudSync();
  const branding = useContext(BrandingContext);
  const { version: settingsVersion } = useSettingsContext();
  const prevUserRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const pushRef = useRef(pushToCloud);

  useEffect(() => { pushRef.current = pushToCloud; }, [pushToCloud]);

  // Auto-pull on login
  useEffect(() => {
    if (user && prevUserRef.current !== user.id) {
      prevUserRef.current = user.id;
      pullFromCloud();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-push when branding changes (skip initial mount)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!user) return;
    const t = setTimeout(() => { pushRef.current(); }, 2000);
    return () => clearTimeout(t);
  }, [branding, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-push when settings change (skip version 0 = initial load)
  useEffect(() => {
    if (!user || settingsVersion === 0) return;
    const t = setTimeout(() => { pushRef.current(); }, 5000);
    return () => clearTimeout(t);
  }, [settingsVersion, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function App() {
  const [mode, setMode] = useState<"light" | "dark">(getInitialMode);
  const [branding, setBranding] = useState<BrandingConfig>(
    () => window.__CTX_BRANDING__ ?? DEFAULT_BRANDING,
  );
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);

  useEffect(() => {
    fetchBranding().then(setBranding);
    // Retry health check if engine is briefly unavailable (e.g. after reset)
    (async function checkHealth(attempts = 0) {
      try {
        const r = await fetch("/api/health");
        const h = await r.json();
        setFirstRun(h.firstRun ?? false);
      } catch {
        if (attempts < 5) {
          setTimeout(() => checkHealth(attempts + 1), 1500);
        } else {
          setFirstRun(false);
        }
      }
    })();
    fetchSettings()
      .then((data) => {
        const saved = data["ui.colorMode"];
        if (saved === "light" || saved === "dark") setMode(saved);
      })
      .catch(() => {});
  }, []);

  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "ui.colorMode": next }),
          }).catch(() => {});
          if (window.orchard?.saveBootTheme) {
            const pal = (p: BrandingConfig["dark"]) => JSON.stringify({
              primary: p.primary, accent: p.accent || p.primary,
              background: p.background, surface: p.surface, text: p.text,
              gradient: branding.accentGradient || "",
            });
            window.orchard.saveBootTheme({ dark: pal(branding.dark), light: pal(branding.light), mode: next });
          }
          return next;
        }),
    }),
    [mode, branding],
  );

  useEffect(() => {
    (window as any).__CTX_COLOR_MODE__ = mode;
  }, [mode]);

  const themes = useMemo(() => buildThemes(branding), [branding]);
  const theme = mode === "dark" ? themes.dark : themes.light;

  const devModeState = useDevModeProvider();
  const eventBus = useEventBusProvider();

  if (firstRun === null) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ViewFallback />
      </ThemeProvider>
    );
  }

  return (
    <BrandingContext.Provider value={branding}>
      <SetBrandingContext.Provider value={setBranding}>
        <ColorModeContext.Provider value={colorMode}>
          <DevModeContext.Provider value={devModeState}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SettingsProvider>
            <EventBusProvider value={eventBus}>
            <DashboardChannelProvider>
            <MonitorChannelProvider>
            <ToastProviderBridge>
            <TunnelAuthProvider>
            <AuthProvider>
            <CloudSyncBridge />
            <AuthSignoutBridge />
            <AuthTokenBridge />
            <LoginGate>
            <ActiveProjectProvider>
              <ProjectThemeBridge />
              <ErrorBoundary>
                {firstRun ? (
                  <OnboardingShell
                    onComplete={(session) => { setPendingSession(session ?? null); setFirstRun(false); setShowTour(true); }}
                    onBrandingChange={setBranding}
                  />
                ) : (
                  <AppLayout
                    onResetOnboarding={() => setFirstRun(true)}
                    onResetTour={() => setShowTour(true)}
                    showTour={showTour}
                    onTourComplete={() => setShowTour(false)}
                    pendingSession={pendingSession}
                  />
                )}
              </ErrorBoundary>
              <TunnelPinModal />
              <ToastHostBridge />
            </ActiveProjectProvider>
            </LoginGate>
            </AuthProvider>
            </TunnelAuthProvider>
            </ToastProviderBridge>
            </MonitorChannelProvider>
            </DashboardChannelProvider>
            </EventBusProvider>
            </SettingsProvider>
          </ThemeProvider>
          </DevModeContext.Provider>
        </ColorModeContext.Provider>
      </SetBrandingContext.Provider>
    </BrandingContext.Provider>
  );
}
