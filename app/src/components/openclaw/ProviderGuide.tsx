// PlatformPicker: single-column list of all supported platforms.
// SetupWizard: linear per-platform setup with a welcome message final step.
// No references to docs.openclaw.ai -- all instructions are inlined.

import { useState, useEffect } from "react";
import {
  Card, CardContent, Typography, Stack, TextField,
  Button, Stepper, Step, StepLabel, StepContent, Chip, Box,
  CircularProgress, Alert, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText,
} from "@mui/material";
import { api } from "../../lib/api";
import { useDashboardChannel } from "../../hooks/useDashboardChannel";
import { EVENTS } from "../../lib/events";
import TelegramIcon from "@mui/icons-material/Telegram";
import ChatIcon from "@mui/icons-material/Chat";
import ForumIcon from "@mui/icons-material/Forum";
import TagIcon from "@mui/icons-material/Tag";
import SignalWifi4BarIcon from "@mui/icons-material/SignalWifi4Bar";
import AppleIcon from "@mui/icons-material/Apple";
import GridViewIcon from "@mui/icons-material/GridView";
import HubIcon from "@mui/icons-material/Hub";
import DnsIcon from "@mui/icons-material/Dns";
import MicrosoftIcon from "@mui/icons-material/Microsoft";

export interface ProviderInfo {
  name: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  credentialLabel: string;
  credentialPlaceholder: string;
  steps: { label: string; detail: string }[];
}

export const PROVIDERS: ProviderInfo[] = [
  {
    name: "telegram",
    label: "Telegram",
    icon: <TelegramIcon />,
    color: "#0088cc",
    description: "Create a bot via @BotFather and paste your token.",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
    steps: [
      {
        label: "Open @BotFather in Telegram",
        detail: "Search for @BotFather in the Telegram app and start a chat. This is Telegram's official bot for creating bots.",
      },
      {
        label: "Create a new bot",
        detail: "Send /newbot and follow the prompts. Choose a name (displayed in chats) and a username (must end in 'bot', e.g. MyOrchardBot).",
      },
      {
        label: "Copy the bot token",
        detail: "BotFather will reply with a token like 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11. Paste it below.",
      },
    ],
  },
  {
    name: "whatsapp",
    label: "WhatsApp",
    icon: <ChatIcon />,
    color: "#25D366",
    description: "Link a WhatsApp account by scanning a QR code.",
    credentialLabel: "QR Pairing",
    credentialPlaceholder: "",
    steps: [
      {
        label: "Enable WhatsApp channel",
        detail: "Click Set Up below. The gateway will generate a QR code for you to scan.",
      },
      {
        label: "Scan the QR code",
        detail: "Open WhatsApp on your phone, go to Settings > Linked Devices > Link a Device, and scan the QR code shown here.",
      },
      {
        label: "Ready",
        detail: "Once paired, messages sent to this WhatsApp account will be routed to your Orchard agent sessions.",
      },
    ],
  },
  {
    name: "discord",
    label: "Discord",
    icon: <ForumIcon />,
    color: "#5865F2",
    description: "Connect a Discord bot to your server.",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "MTI3NjEz...your-bot-token",
    steps: [
      {
        label: "Create a Discord Application",
        detail: "Go to discord.com/developers/applications and click New Application. Give it a name.",
      },
      {
        label: "Create a Bot user",
        detail: "In your application, go to the Bot tab and click Add Bot. Enable MESSAGE CONTENT INTENT under Privileged Gateway Intents.",
      },
      {
        label: "Copy the bot token",
        detail: "Click Reset Token to generate a new token. Copy it and paste it below.",
      },
      {
        label: "Invite the bot to your server",
        detail: "Go to OAuth2 > URL Generator, select bot scope with Send Messages and Read Message History permissions. Open the generated URL to invite your bot.",
      },
    ],
  },
  {
    name: "slack",
    label: "Slack",
    icon: <TagIcon />,
    color: "#4A154B",
    description: "Add an Orchard agent to your Slack workspace.",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "xoxb-your-slack-bot-token",
    steps: [
      {
        label: "Create a Slack App",
        detail: "Go to api.slack.com/apps and click Create New App. Choose From scratch and select your workspace.",
      },
      {
        label: "Add bot permissions",
        detail: "Under OAuth & Permissions, add these Bot Token Scopes: chat:write, im:history, im:read, im:write, app_mentions:read.",
      },
      {
        label: "Install to workspace",
        detail: "Click Install to Workspace and authorize. Copy the Bot User OAuth Token (starts with xoxb-).",
      },
      {
        label: "Enable Events",
        detail: "Under Event Subscriptions, enable events and set the request URL to your Orchard engine's webhook endpoint.",
      },
    ],
  },
  {
    name: "signal",
    label: "Signal",
    icon: <SignalWifi4BarIcon />,
    color: "#2592E9",
    description: "Connect a Signal number via signal-cli.",
    credentialLabel: "Phone Number",
    credentialPlaceholder: "+15551234567",
    steps: [
      {
        label: "Install signal-cli",
        detail: "Install signal-cli on the same machine. See github.com/AsamK/signal-cli for installation instructions.",
      },
      {
        label: "Register a phone number",
        detail: "Run: signal-cli -u +15551234567 register. Then verify with the code SMS-ed to that number.",
      },
      {
        label: "Enter the registered number",
        detail: "Paste the phone number (with country code) you registered with signal-cli.",
      },
    ],
  },
  {
    name: "imessage",
    label: "iMessage",
    icon: <AppleIcon />,
    color: "#1C8EF9",
    description: "Receive iMessages on macOS via Bluebubbles.",
    credentialLabel: "Server URL",
    credentialPlaceholder: "http://localhost:1234",
    steps: [
      {
        label: "Install Bluebubbles on macOS",
        detail: "Download Bluebubbles from bluebubbles.app and install it on the Mac that has iMessage set up.",
      },
      {
        label: "Enable the HTTP API",
        detail: "In Bluebubbles settings, enable the HTTP API and note your server URL and password.",
      },
      {
        label: "Enter the server URL",
        detail: "Paste the Bluebubbles server URL (e.g. http://localhost:1234) below.",
      },
    ],
  },
  {
    name: "matrix",
    label: "Matrix",
    icon: <GridViewIcon />,
    color: "#0DBD8B",
    description: "Connect to any Matrix homeserver.",
    credentialLabel: "Access Token",
    credentialPlaceholder: "syt_your_matrix_access_token",
    steps: [
      {
        label: "Create a Matrix account",
        detail: "Register a bot account on your Matrix homeserver (e.g. matrix.org, or your own server).",
      },
      {
        label: "Get an access token",
        detail: "Log in with the bot account and retrieve the access token from Element: Settings > Help & About > Access Token.",
      },
      {
        label: "Enter the access token",
        detail: "Paste the access token below. The gateway will use it to join rooms and handle messages.",
      },
    ],
  },
  {
    name: "irc",
    label: "IRC",
    icon: <HubIcon />,
    color: "#6C6C6C",
    description: "Join IRC channels on any network.",
    credentialLabel: "Server",
    credentialPlaceholder: "irc.libera.chat",
    steps: [
      {
        label: "Choose a server and channel",
        detail: "Pick the IRC network and channel you want your agent to join, e.g. irc.libera.chat #orchard.",
      },
      {
        label: "Choose a nickname",
        detail: "Pick a nickname for your bot. Make sure it is not already registered on that network.",
      },
      {
        label: "Enter the server hostname",
        detail: "Paste the IRC server hostname below. Default port is 6697 (TLS).",
      },
    ],
  },
  {
    name: "teams",
    label: "Microsoft Teams",
    icon: <MicrosoftIcon />,
    color: "#6264A7",
    description: "Add an agent to your Teams workspace.",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "your-teams-bot-token",
    steps: [
      {
        label: "Register an Azure Bot",
        detail: "Go to portal.azure.com, create an Azure Bot resource, and note the App ID and password.",
      },
      {
        label: "Create the Teams app",
        detail: "In Teams Developer Portal (dev.teams.microsoft.com), create an app that points to your Azure Bot.",
      },
      {
        label: "Copy the bot token",
        detail: "Use the App ID and password from your Azure Bot registration as the token below (format: appId:password).",
      },
    ],
  },
  {
    name: "line",
    label: "LINE",
    icon: <DnsIcon />,
    color: "#06C755",
    description: "Connect a LINE Official Account.",
    credentialLabel: "Channel Access Token",
    credentialPlaceholder: "your-line-channel-access-token",
    steps: [
      {
        label: "Create a LINE Official Account",
        detail: "Go to developers.line.biz and create a new Messaging API channel.",
      },
      {
        label: "Enable webhooks",
        detail: "In your channel settings, enable Use webhook and set the webhook URL to your Orchard engine's endpoint.",
      },
      {
        label: "Copy the Channel Access Token",
        detail: "Under Messaging API, issue a long-lived channel access token and paste it below.",
      },
    ],
  },
];

interface PlatformPickerProps {
  onSelect: (provider: ProviderInfo) => void;
  existingChannels: string[];
}

export function PlatformPicker({ onSelect, existingChannels }: PlatformPickerProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Connect a channel</Typography>
      <Card variant="outlined">
        <List disablePadding>
          {PROVIDERS.map((p, i) => {
            const exists = existingChannels.includes(p.name);
            return (
              <ListItem
                key={p.name}
                disablePadding
                divider={i < PROVIDERS.length - 1}
                secondaryAction={
                  exists
                    ? <Chip label="Added" size="small" />
                    : (
                      <Button size="small" variant="outlined" onClick={() => onSelect(p)}>
                        Connect
                      </Button>
                    )
                }
              >
                <ListItemButton
                  onClick={() => !exists && onSelect(p)}
                  disabled={exists}
                  sx={{ py: 1.25 }}
                >
                  <ListItemIcon sx={{ color: p.color, minWidth: 40 }}>
                    {p.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={p.label}
                    secondary={p.description}
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Card>
    </Box>
  );
}

interface SetupWizardProps {
  provider: ProviderInfo;
  initialWelcomeMessage?: string;
  onComplete: (name: string, creds: Record<string, unknown>, welcomeMessage?: string) => void;
  onCancel: () => void;
  onPrepare?: () => void;
}

export function SetupWizard({ provider, initialWelcomeMessage = "", onComplete, onCancel, onPrepare }: SetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [token, setToken] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcomeMessage);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loginDone, setLoginDone] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [qrTimedOut, setQrTimedOut] = useState(false);
  const { channel } = useDashboardChannel();
  const isWhatsApp = provider.name === "whatsapp";
  const isQrStep = isWhatsApp && activeStep === 1;

  // The welcome message step is appended after provider-specific steps.
  const totalSteps = provider.steps.length + 1;
  const welcomeStepIndex = provider.steps.length;
  const isWelcomeStep = activeStep === welcomeStepIndex;

  const startLogin = () => {
    setQrDataUrl(null);
    setLoginDone(false);
    setLoginError(null);
    setLoginStatus(null);
    setQrTimedOut(false);
    api.openclawChannelLogin("whatsapp").catch(() => {});
  };

  useEffect(() => {
    if (!isQrStep || !channel) return;

    startLogin();

    const handleOutput = (payload: { type: string; data?: string }) => {
      if (payload.type === "qr" && payload.data) {
        setQrDataUrl(payload.data);
        setLoginStatus(null);
      } else if (payload.type === "status" && payload.data) {
        setLoginStatus(payload.data);
      }
    };
    const handleDone = (payload: { ok: boolean; error?: string }) => {
      setLoginDone(true);
      if (!payload.ok) setLoginError(payload.error || "Login failed");
    };

    channel.on(EVENTS.openclaw.loginOutput, handleOutput);
    channel.on(EVENTS.openclaw.loginDone, handleDone);

    const timeout = setTimeout(() => setQrTimedOut(true), 70_000);

    return () => {
      channel.off(EVENTS.openclaw.loginOutput, handleOutput);
      channel.off(EVENTS.openclaw.loginDone, handleDone);
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQrStep, channel]);

  const handleFinish = () => {
    const creds: Record<string, unknown> = isWhatsApp ? {} : { bot_token: token.trim() };
    onComplete(provider.name, creds, welcomeMessage || undefined);
  };

  const allSteps = [
    ...provider.steps,
    {
      label: "Set a welcome message",
      detail: "",
    },
  ];

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ color: provider.color, "& svg": { fontSize: 24 } }}>{provider.icon}</Box>
          <Typography variant="h6">Set up {provider.label}</Typography>
          <Button size="small" onClick={onCancel} sx={{ ml: "auto !important" }}>Cancel</Button>
        </Stack>

        <Stepper activeStep={activeStep} orientation="vertical">
          {allSteps.map((step, i) => (
            <Step key={i}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {i < welcomeStepIndex && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.detail}
                  </Typography>
                )}

                {isQrStep && i === 1 && (
                  <Box sx={{ mb: 2 }}>
                    {loginError && <Alert severity="error" sx={{ mb: 1 }}>{loginError}</Alert>}
                    {loginDone && !loginError && <Alert severity="success" sx={{ mb: 1 }}>Linked! Click Next to continue.</Alert>}
                    {!qrDataUrl && !loginDone && !loginError && !qrTimedOut && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          {loginStatus ?? "Waiting for QR code..."}
                        </Typography>
                      </Stack>
                    )}
                    {!qrDataUrl && !loginDone && !loginError && qrTimedOut && (
                      <Stack spacing={1}>
                        <Typography variant="caption" color="warning.main">
                          QR code not received. The gateway may not be running.
                        </Typography>
                        <Button size="small" variant="outlined" onClick={startLogin} sx={{ alignSelf: "flex-start" }}>
                          Retry
                        </Button>
                      </Stack>
                    )}
                    {qrDataUrl && (
                      <Box sx={{ display: "inline-block", p: 1, bgcolor: "#fff", borderRadius: 1 }}>
                        <img src={qrDataUrl} alt="WhatsApp QR code" style={{ display: "block", width: 240, height: 240 }} />
                      </Box>
                    )}
                  </Box>
                )}

                {i < welcomeStepIndex && i === provider.steps.length - 1 && !isWhatsApp && (
                  <TextField
                    size="small"
                    fullWidth
                    label={provider.credentialLabel}
                    placeholder={provider.credentialPlaceholder}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                    sx={{ mb: 2 }}
                  />
                )}

                {isWelcomeStep && i === welcomeStepIndex && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Optionally set a message your agent sends to new contacts the first time they reach out.
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      label="Welcome message"
                      placeholder="Hi! I'm your Orchard agent. Ask me anything."
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      helperText="Sent once when a new contact messages your agent for the first time. Leave blank to skip."
                    />
                  </Box>
                )}

                <Stack direction="row" spacing={1}>
                  {i > 0 && (
                    <Button size="small" onClick={() => setActiveStep(i - 1)}>Back</Button>
                  )}
                  {i < totalSteps - 1 && (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!isWhatsApp && i === provider.steps.length - 1 && !token.trim()}
                      onClick={() => {
                        if (isWhatsApp && i === 0) onPrepare?.();
                        setActiveStep(i + 1);
                      }}
                    >
                      Next
                    </Button>
                  )}
                  {i === totalSteps - 1 && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleFinish}
                        disabled={!isWhatsApp && i < welcomeStepIndex && !token.trim()}
                      >
                        {isWhatsApp ? "Set Up" : "Connect"}
                      </Button>
                      <Button size="small" onClick={handleFinish} color="inherit">
                        Skip
                      </Button>
                    </>
                  )}
                </Stack>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
}

export { PROVIDERS as default };
