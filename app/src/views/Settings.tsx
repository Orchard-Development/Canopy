import { useState, useEffect, useRef } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  IconButton,
  Stack, TextField, Typography, Tabs, Tab,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ReplayIcon from "@mui/icons-material/Replay";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Tooltip from "@mui/material/Tooltip";
import { useSearchParams } from "react-router-dom";
import { AiProviderCard, type SettingsData } from "../components/settings/AiProviderCard";
import { BrandingCard } from "../components/settings/BrandingCard";
import { TerminalDefaultsCard } from "../components/settings/TerminalDefaultsCard";
import { CliToolsCard } from "../components/settings/CliToolsCard";
import EngineView from "./Engine";
import { RemoteAccessCard } from "../components/settings/RemoteAccessCard";
import { IdentityCard } from "../components/settings/IdentityCard";
import { AudioCard } from "../components/settings/AudioCard";
import { SecretsCard } from "../components/settings/SecretsCard";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { PageLayout } from "../components/PageLayout";
import { api } from "../lib/api";
import { LoginForm } from "../components/settings/LoginGate";
import { useAuth } from "../hooks/useAuth";
import { useDevMode } from "../hooks/useDevMode";
import LogoutIcon from "@mui/icons-material/Logout";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { useCloudSync } from "../hooks/useCloudSync";
import { ViewsCard } from "../components/project/ViewsCard";
import { SeedPacksCard } from "../components/settings/SeedPacksCard";
import { AutomationCard } from "../components/settings/AutomationCard";
import { ModelDefaultsCard } from "../components/settings/ModelDefaultsCard";
import { NotificationsCard } from "../components/settings/NotificationsCard";
import { DesktopPermissionsCard } from "../components/settings/DesktopPermissionsCard";
import { UsageStatsCard } from "../components/settings/UsageStatsCard";
import { useSettingsContext } from "../contexts/SettingsContext";
import DatabaseOverview from "./database-explorer/DatabaseOverview";

const TAB_KEYS = ["providers", "secrets", "audio", "appearance", "views", "seedpacks", "automation", "stats", "notifications", "general", "database", "engine", "account"] as const;
type TabKey = (typeof TAB_KEYS)[number];

interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

function useSettings() {
  const { setAllSettings } = useSettingsContext();
  const [settings, setSettings] = useState<SettingsData>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [models, setModels] = useState<ModelOption[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      setSettings(data);
      initialized.current = true;
    }).catch(() => {});
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const timer = setTimeout(save, 800);
    return () => clearTimeout(timer);
  }, [settings]);

  async function save() {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(await res.text());
      setAllSettings(settings as Record<string, string>);
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function testKey(provider: "anthropic" | "openai" | "xai" | "gemini" | "groq" | "openrouter") {
    const keyMap: Record<string, string | undefined> = {
      anthropic: settings.anthropic_api_key,
      openai: settings.openai_api_key,
      xai: settings.xai_api_key,
      gemini: settings.gemini_api_key,
      groq: settings.groq_api_key,
      openrouter: settings.openrouter_api_key,
    };
    const key = keyMap[provider];
    if (!key) return;

    setTesting(provider);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const text = await res.text();
      if (!text) { setTestResult("Error: empty response from server"); return; }
      let data: { valid?: boolean; ok?: boolean; model?: string; error?: string };
      try { data = JSON.parse(text); } catch { setTestResult(`Error: server returned non-JSON (${res.status})`); return; }
      setTestResult(data.valid || data.ok ? `Connected${data.model ? `: ${data.model}` : ""}` : `Failed: ${data.error ?? "unknown error"}`);
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(null);
    }
  }

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function toggleVisible(key: string) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return { settings, saved, error, testing, testResult, setTestResult, visible, models, save, testKey, update, toggleVisible };
}

function ProvidersTab({ s }: { s: ReturnType<typeof useSettings> }) {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <AiProviderCard
        settings={s.settings}
        visible={s.visible}
        testing={s.testing}
        models={s.models}
        onUpdate={s.update}
        onTestKey={s.testKey}
        onToggleVisible={s.toggleVisible}
      />
    </Box>
  );
}

function AudioTab() {
  const noop = () => {};
  const audio = useAudioCapture(noop);
  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <AudioCard
        source={audio.source}
        micDeviceId={audio.micDeviceId}
        availableMics={audio.availableMics}
        autoSend={audio.autoSend}
        chunkDuration={audio.chunkDuration}
        onSourceChange={audio.setSource}
        onMicDeviceChange={audio.setMicDeviceId}
        onRefreshMics={audio.refreshMics}
        onAutoSendChange={audio.setAutoSend}
        onChunkDurationChange={audio.setChunkDuration}
      />
    </Box>
  );
}

function AppearanceTab() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <BrandingCard />
    </Box>
  );
}

function DevModeCard() {
  const { packaged, devOverride, devMode, setDevOverride } = useDevMode();
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Developer Mode</Typography>
        {packaged ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Enables advanced features like terminal sessions, agent scheduling,
              session profiling, and MCP tools for workspace development.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant={devOverride ? "contained" : "outlined"}
                onClick={() => setDevOverride(true)}
                disableElevation
              >
                Enabled
              </Button>
              <Button
                variant={!devOverride ? "contained" : "outlined"}
                onClick={() => setDevOverride(false)}
                disableElevation
              >
                Disabled
              </Button>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Running in development mode. All features are enabled.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ResetCard() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await fetch("/api/reset", { method: "POST" });
      // Use Electron full restart if available (relaunches entire app)
      if (typeof window.ctx?.fullRestart === "function") {
        window.ctx.fullRestart();
        return;
      }
      // Browser fallback: reload -- engine is still running with fresh DB
      window.location.reload();
    } catch {
      setResetting(false);
    }
  }

  return (
    <>
      <Card sx={{ mt: 3, borderColor: "error.main", borderWidth: 1, borderStyle: "solid" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="error">Reset All Data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Delete all projects, settings, memory, sessions, and return to the initial setup wizard.
            This cannot be undone.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setOpen(true)}
          >
            Reset Everything
          </Button>
        </CardContent>
      </Card>
      <Dialog open={open} onClose={() => { setOpen(false); setConfirm(""); }} maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Reset All Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete all projects, settings, memory, terminal sessions, and
            restart Orchard from scratch. You will go through onboarding again.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2, fontWeight: 600 }}>
            Type <strong>RESET</strong> to confirm.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Type RESET"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</Button>
          <Button
            onClick={handleReset}
            variant="contained"
            color="error"
            disabled={confirm !== "RESET" || resetting}
          >
            {resetting ? "Resetting..." : "Reset Everything"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function GeneralTab({ s, devMode }: { s: ReturnType<typeof useSettings>; devMode: boolean }) {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <DesktopPermissionsCard />
      <RemoteAccessCard
        remoteEnabled={s.settings.remote_access_enabled ?? "true"}
        onUpdate={s.update}
      />
      <CliToolsCard />
      <DevModeCard />
      {devMode && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Profiler Mode</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Auto-apply writes improvements directly. Suggest-only flags them for review.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant={s.settings.profiler_mode === "auto" ? "contained" : "outlined"}
                onClick={() => s.update("profiler_mode", "auto")}
                disableElevation
              >
                Auto-apply
              </Button>
              <Button
                variant={s.settings.profiler_mode !== "auto" ? "contained" : "outlined"}
                onClick={() => s.update("profiler_mode", "suggest")}
                disableElevation
              >
                Suggest only
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      <TerminalDefaultsCard
        value={s.settings.default_terminal_project ?? ""}
        onChange={(id) => s.update("default_terminal_project", id)}
      />
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Onboarding</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Re-run the initial setup wizard to reconfigure providers, persona, and preferences.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={() => window.dispatchEvent(new CustomEvent("ctx:reset-onboarding"))}
            >
              Re-run Onboarding
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={() => window.dispatchEvent(new CustomEvent("ctx:reset-tour"))}
            >
              Re-run Tour
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <ResetCard />
    </Box>
  );
}

function ViewsTab() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <ViewsCard />
    </Box>
  );
}

function CloudSyncCard() {
  const { pushToCloud, pullFromCloud, pushing, pulling, lastSynced, error } = useCloudSync();
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Cloud Sync</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Push settings to the cloud or pull them to this machine.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {lastSynced && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Last synced: {new Date(lastSynced).toLocaleString()}
          </Typography>
        )}
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<CloudUploadIcon />}
            onClick={pushToCloud} disabled={pushing || pulling}>
            {pushing ? "Pushing..." : "Push to Cloud"}
          </Button>
          <Button variant="outlined" startIcon={<CloudDownloadIcon />}
            onClick={pullFromCloud} disabled={pushing || pulling}>
            {pulling ? "Pulling..." : "Pull from Cloud"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function AccountTab({ s }: { s: ReturnType<typeof useSettings> }) {
  const { user, signOut, configured } = useAuth();

  if (!configured) {
    return (
      <Box sx={{ maxWidth: 720, mx: "auto" }}>
        <IdentityCard displayName={s.settings.display_name ?? ""}
          avatarBase64={s.settings.avatar_base64 ?? ""} onUpdate={s.update} />
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">
            Authentication is not configured.
          </Typography>
        </CardContent></Card>
      </Box>
    );
  }

  if (user) {
    return (
      <Box sx={{ maxWidth: 720, mx: "auto" }}>
        <IdentityCard displayName={s.settings.display_name ?? ""}
          avatarBase64={s.settings.avatar_base64 ?? ""} onUpdate={s.update} />
        <Card sx={{ mb: 3 }}><CardContent>
          <Typography variant="h6" gutterBottom>Account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Signed in as {user.email}
          </Typography>
          <Button variant="outlined" startIcon={<LogoutIcon />} onClick={signOut}>
            Sign out
          </Button>
        </CardContent></Card>
        <CloudSyncCard />
      </Box>
    );
  }

  return <LoginForm />;
}

function SettingsContent() {
  const [params, setParams] = useSearchParams();
  const { devMode } = useDevMode();

  const visibleTabs: TabKey[] = devMode ? [...TAB_KEYS] : TAB_KEYS.filter((t) => t !== "engine");
  const raw = params.get("tab") as TabKey | null;
  const tab = visibleTabs.includes(raw as TabKey) ? (raw as TabKey) : "providers";
  const tabIndex = visibleTabs.indexOf(tab);

  const s = useSettings();

  const TAB_LABELS: Record<TabKey, string> = {
    providers: "AI Providers",
    secrets: "Secrets",
    audio: "Audio",
    appearance: "Appearance",
    views: "Views",
    seedpacks: "Seed Packs",
    automation: "Automation",
    stats: "Stats",
    notifications: "Notifications",
    general: "General",
    database: "Database",
    engine: "Engine",
    account: "Account",
  };

  return (
    <>
      {s.saved && <Alert severity="success" sx={{ mb: 2 }}>Saved</Alert>}
      {s.error && <Alert severity="error" sx={{ mb: 2 }}>{s.error}</Alert>}
      {s.testResult && (
        <Alert
          severity={s.testResult.startsWith("Connected") ? "success" : "error"}
          sx={{ mb: 2 }}
          onClose={() => s.setTestResult(null)}
        >
          {s.testResult}
        </Alert>
      )}

      <Tabs value={tabIndex} onChange={(_, idx) => setParams({ tab: visibleTabs[idx] })} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        {visibleTabs.map((key) => <Tab key={key} label={TAB_LABELS[key]} />)}
      </Tabs>

      {tab === "providers" && <Box data-tour="tour-settings-providers"><ProvidersTab s={s} /></Box>}
      {tab === "secrets" && <Box sx={{ maxWidth: 720, mx: "auto" }}><SecretsCard /></Box>}
      {tab === "audio" && <AudioTab />}
      {tab === "appearance" && <Box data-tour="tour-settings-appearance"><AppearanceTab /></Box>}
      {tab === "views" && <Box data-tour="tour-settings-views"><ViewsTab /></Box>}
      {tab === "seedpacks" && <Box sx={{ maxWidth: 720, mx: "auto" }}><SeedPacksCard /></Box>}
      {tab === "automation" && (
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
          <Stack spacing={3}>
            <AutomationCard />
            <ModelDefaultsCard settings={s.settings} models={s.models} onUpdate={s.update} />
          </Stack>
        </Box>
      )}
      {tab === "stats" && <Box sx={{ maxWidth: 720, mx: "auto" }}><UsageStatsCard /></Box>}
      {tab === "notifications" && <Box sx={{ maxWidth: 720, mx: "auto" }}><NotificationsCard /></Box>}
      {tab === "general" && <GeneralTab s={s} devMode={devMode} />}
      {tab === "database" && <Box sx={{ height: "calc(100vh - 220px)", minHeight: 400 }}><DatabaseOverview /></Box>}
      {tab === "engine" && <EngineView />}
      {tab === "account" && <AccountTab s={s} />}

    </>
  );
}

export default function Settings() {
  return (
    <PageLayout title="Settings" icon={<SettingsIcon color="primary" />}>
      <SettingsContent />
    </PageLayout>
  );
}
