import { useState } from "react";
import {
  Box, Typography, Stack, Alert, Skeleton, Button, LinearProgress, Card, CardContent,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { useOpenClaw } from "../hooks/useOpenClaw";
import type { InstallResult } from "../hooks/useOpenClaw";
import { GatewayStatus } from "../components/openclaw/GatewayStatus";
import { ChannelList } from "../components/openclaw/ChannelList";
import { MessageFeed } from "../components/openclaw/MessageFeed";
import {
  ProviderPicker, ProviderSetupWizard, PROVIDERS,
} from "../components/openclaw/ProviderGuide";
import type { ProviderInfo } from "../components/openclaw/ProviderGuide";

export default function OpenClaw() {
  const oc = useOpenClaw();
  const [settingUp, setSettingUp] = useState<ProviderInfo | null>(null);

  if (oc.loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  const handleProviderComplete = (name: string, creds: Record<string, unknown>) => {
    oc.addChannel(name);
    if (Object.keys(creds).length > 0) {
      oc.updateChannel(name, creds);
    }
    setSettingUp(null);

    if (!oc.status?.enabled) {
      oc.setEnabled(true);
    }
  };

  // State 1: Not installed
  if (!oc.status?.installed) {
    return (
      <Box sx={{ p: 2, maxWidth: 600 }}>
        <Header />
        {oc.error && <ErrorAlert error={oc.error} />}
        <InstallCard
          installing={oc.installing}
          result={oc.installResult}
          onInstall={oc.install}
        />
      </Box>
    );
  }

  // State 2: Installed, no channels yet
  if (oc.status.channels_configured === 0 && !settingUp) {
    return (
      <Box sx={{ p: 2, maxWidth: 800 }}>
        <Header />
        {oc.error && <ErrorAlert error={oc.error} />}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <RocketLaunchIcon color="primary" />
              <Typography variant="h6">Get started</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              OpenClaw is installed{oc.status.version ? ` (${oc.status.version})` : ""}.
              Connect a messaging platform to let people talk to your Orchard agents.
            </Typography>
            <ProviderPicker onSelect={setSettingUp} existingChannels={[]} />
          </CardContent>
        </Card>
      </Box>
    );
  }

  // State 3: Setting up a provider
  if (settingUp) {
    return (
      <Box sx={{ p: 2, maxWidth: 800 }}>
        <Header />
        {oc.error && <ErrorAlert error={oc.error} />}
        <ProviderSetupWizard
          provider={settingUp}
          onComplete={handleProviderComplete}
          onCancel={() => setSettingUp(null)}
        />
      </Box>
    );
  }

  // State 4: Running
  return (
    <Box sx={{ p: 2, maxWidth: 800 }}>
      <Header />
      {oc.error && <ErrorAlert error={oc.error} />}

      <GatewayStatus
        status={oc.status}
        onStart={oc.start}
        onStop={oc.stop}
        onRestart={oc.restart}
        onSetEnabled={oc.setEnabled}
      />

      <ChannelList
        channels={oc.channels}
        onUpdate={oc.updateChannel}
        onAdd={(name) => {
          const provider = PROVIDERS.find((p) => p.name === name);
          if (provider) {
            setSettingUp(provider);
          } else {
            oc.addChannel(name);
          }
        }}
        onRemove={oc.removeChannel}
      />
      <MessageFeed messages={oc.messages} />

      <Box sx={{ mt: 3 }}>
        <ProviderPicker
          onSelect={setSettingUp}
          existingChannels={oc.channels.map((c) => c.name)}
        />
      </Box>
    </Box>
  );
}

function Header() {
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <SmartToyIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>OpenClaw</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Messaging channel gateway. Let people talk to your Orchard agents
        through Telegram, WhatsApp, Discord, Slack, and more.
      </Typography>
    </>
  );
}

function ErrorAlert({ error }: { error: string }) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      {error}
    </Alert>
  );
}

interface InstallCardProps {
  installing: boolean;
  result: InstallResult | null;
  onInstall: () => void;
}

function InstallCard({ installing, result, onInstall }: InstallCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Install OpenClaw</Typography>
          <Typography variant="body2" color="text.secondary">
            OpenClaw is a free, open-source messaging gateway that connects
            20+ platforms to your Orchard agents. One click to install.
          </Typography>

          {/* Progress */}
          {installing && (
            <Card variant="outlined" sx={{ bgcolor: "action.hover" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: "50%",
                      bgcolor: "info.main",
                      animation: "pulse 1.5s infinite",
                      "@keyframes pulse": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.3 },
                      },
                    }} />
                    <Typography variant="body2" fontWeight={500}>
                      Installing OpenClaw...
                    </Typography>
                  </Stack>
                  <LinearProgress />
                  <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                    $ npm install -g openclaw@latest
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Success result */}
          {result?.ok && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <Typography variant="body2" fontWeight={500}>
                OpenClaw installed successfully
              </Typography>
              {result.output && (
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    mt: 1, fontFamily: "monospace", whiteSpace: "pre-wrap",
                    maxHeight: 120, overflow: "auto",
                  }}
                >
                  {result.output}
                </Typography>
              )}
            </Alert>
          )}

          {/* Failed result */}
          {result && !result.ok && (
            <Alert severity="error" icon={<ErrorOutlineIcon />}>
              <Typography variant="body2" fontWeight={500}>
                Installation failed
              </Typography>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  mt: 1, fontFamily: "monospace", whiteSpace: "pre-wrap",
                  maxHeight: 200, overflow: "auto",
                }}
              >
                {result.output || result.error}
              </Typography>
            </Alert>
          )}

          {/* Button */}
          {!result?.ok && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onInstall}
              disabled={installing}
              sx={{ alignSelf: "flex-start" }}
            >
              {installing ? "Installing..." : result ? "Retry Install" : "Install OpenClaw"}
            </Button>
          )}

          <Typography variant="caption" color="text.secondary">
            Requires Node.js 22+. Installs globally via npm.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
