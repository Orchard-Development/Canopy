import { useState } from "react";
import {
  Box, Typography, Stack, Alert, Skeleton,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useOpenClaw } from "../hooks/useOpenClaw";
import { GatewayStatus } from "../components/openclaw/GatewayStatus";
import { ChannelList } from "../components/openclaw/ChannelList";
import { MessageFeed } from "../components/openclaw/MessageFeed";
import {
  PlatformPicker, SetupWizard, PROVIDERS,
} from "../components/openclaw/ProviderGuide";
import type { ProviderInfo } from "../components/openclaw/ProviderGuide";

export default function MessagingGateway() {
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

  const handleProviderComplete = (name: string, creds: Record<string, unknown>, welcomeMsg?: string) => {
    const isWhatsApp = name === "whatsapp";
    if (!isWhatsApp) oc.addChannel(name);
    const updates: Record<string, unknown> = { ...creds };
    if (welcomeMsg !== undefined) updates.welcome_message = welcomeMsg;
    if (Object.keys(updates).length > 0) {
      oc.updateChannel(name, updates);
    }
    setSettingUp(null);

    if (!oc.status?.enabled) {
      oc.setEnabled(true);
    }
  };

  // State 1: No channels yet — show platform picker directly
  if (oc.status?.channels_configured === 0 && !settingUp) {
    return (
      <Box sx={{ p: 2, maxWidth: 800 }}>
        <Header />
        {oc.error && <ErrorAlert error={oc.error} />}
        <PlatformPicker onSelect={setSettingUp} existingChannels={[]} />
      </Box>
    );
  }

  // State 2: Setting up a provider
  if (settingUp) {
    return (
      <Box sx={{ p: 2, maxWidth: 800 }}>
        <Header />
        {oc.error && <ErrorAlert error={oc.error} />}
        <SetupWizard
          provider={settingUp}
          initialWelcomeMessage={oc.welcomeMessage}
          onComplete={handleProviderComplete}
          onCancel={() => setSettingUp(null)}
          onPrepare={() => {
            oc.addChannel(settingUp.name);
            if (!oc.status?.enabled) oc.setEnabled(true);
          }}
        />
      </Box>
    );
  }

  // State 3: Running
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
        <PlatformPicker
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
        <SendIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>Messaging Gateway</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect messaging platforms to let people talk to your Orchard agents
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
