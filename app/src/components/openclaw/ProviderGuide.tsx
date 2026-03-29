import { useState } from "react";
import {
  Card, CardContent, CardActionArea, Typography, Stack, TextField,
  Button, Stepper, Step, StepLabel, StepContent, Link, Chip, Box,
} from "@mui/material";
import TelegramIcon from "@mui/icons-material/Telegram";
import ChatIcon from "@mui/icons-material/Chat";
import ForumIcon from "@mui/icons-material/Forum";
import TagIcon from "@mui/icons-material/Tag";

interface ProviderInfo {
  name: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  credentialLabel: string;
  credentialPlaceholder: string;
  steps: { label: string; detail: string }[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: "telegram",
    label: "Telegram",
    icon: <TelegramIcon />,
    color: "#0088cc",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
    steps: [
      {
        label: "Open @BotFather in Telegram",
        detail: "Search for @BotFather in Telegram and start a chat. This is Telegram's official bot for creating bots.",
      },
      {
        label: "Create a new bot",
        detail: "Send /newbot and follow the prompts. Choose a name (displayed in chats) and a username (must end in 'bot', e.g. MyOrchardBot).",
      },
      {
        label: "Copy the bot token",
        detail: "BotFather will give you a token like 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11. Paste it below.",
      },
    ],
  },
  {
    name: "discord",
    label: "Discord",
    icon: <ForumIcon />,
    color: "#5865F2",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "MTI3NjEz...your-bot-token",
    steps: [
      {
        label: "Create a Discord Application",
        detail: "Go to discord.com/developers/applications and click 'New Application'. Give it a name.",
      },
      {
        label: "Create a Bot user",
        detail: "In your application, go to the Bot tab and click 'Add Bot'. Enable MESSAGE CONTENT INTENT under Privileged Gateway Intents.",
      },
      {
        label: "Copy the bot token",
        detail: "Click 'Reset Token' to generate a new token. Copy it and paste it below.",
      },
      {
        label: "Invite the bot to your server",
        detail: "Go to OAuth2 > URL Generator, select 'bot' scope with 'Send Messages' and 'Read Message History' permissions. Open the generated URL to invite it.",
      },
    ],
  },
  {
    name: "slack",
    label: "Slack",
    icon: <TagIcon />,
    color: "#4A154B",
    credentialLabel: "Bot Token",
    credentialPlaceholder: "xoxb-your-slack-bot-token",
    steps: [
      {
        label: "Create a Slack App",
        detail: "Go to api.slack.com/apps and click 'Create New App'. Choose 'From scratch' and select your workspace.",
      },
      {
        label: "Add bot permissions",
        detail: "Under OAuth & Permissions, add these Bot Token Scopes: chat:write, im:history, im:read, im:write, app_mentions:read.",
      },
      {
        label: "Install to workspace",
        detail: "Click 'Install to Workspace' and authorize. Copy the Bot User OAuth Token (starts with xoxb-).",
      },
      {
        label: "Enable Events",
        detail: "Under Event Subscriptions, enable events. OpenClaw will provide the request URL automatically once connected.",
      },
    ],
  },
  {
    name: "whatsapp",
    label: "WhatsApp",
    icon: <ChatIcon />,
    color: "#25D366",
    credentialLabel: "QR Pairing",
    credentialPlaceholder: "",
    steps: [
      {
        label: "Enable WhatsApp channel",
        detail: "Click 'Set Up' below. OpenClaw will generate a QR code.",
      },
      {
        label: "Scan the QR code",
        detail: "Open WhatsApp on your phone > Settings > Linked Devices > Link a Device. Scan the QR code shown here.",
      },
      {
        label: "Ready",
        detail: "Once paired, messages to this WhatsApp account will route to Orchard agent sessions.",
      },
    ],
  },
];

interface ProviderPickerProps {
  onSelect: (provider: ProviderInfo) => void;
  existingChannels: string[];
}

export function ProviderPicker({ onSelect, existingChannels }: ProviderPickerProps) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Choose a messaging platform</Typography>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {PROVIDERS.map((p) => {
          const exists = existingChannels.includes(p.name);
          return (
            <Card
              key={p.name}
              variant="outlined"
              sx={{
                width: 160,
                opacity: exists ? 0.5 : 1,
                pointerEvents: exists ? "none" : "auto",
              }}
            >
              <CardActionArea onClick={() => onSelect(p)} sx={{ p: 2, textAlign: "center" }}>
                <Box sx={{ color: p.color, mb: 1, "& svg": { fontSize: 32 } }}>{p.icon}</Box>
                <Typography variant="subtitle2">{p.label}</Typography>
                {exists && <Chip label="Added" size="small" sx={{ mt: 0.5 }} />}
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

interface SetupWizardProps {
  provider: ProviderInfo;
  onComplete: (name: string, creds: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function ProviderSetupWizard({ provider, onComplete, onCancel }: SetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [token, setToken] = useState("");
  const isLastStep = activeStep === provider.steps.length - 1;
  const isWhatsApp = provider.name === "whatsapp";

  const handleFinish = () => {
    const creds: Record<string, unknown> = isWhatsApp ? {} : { bot_token: token.trim() };
    onComplete(provider.name, creds);
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ color: provider.color, "& svg": { fontSize: 24 } }}>{provider.icon}</Box>
          <Typography variant="h6">Set up {provider.label}</Typography>
          <Button size="small" onClick={onCancel} sx={{ ml: "auto !important" }}>Cancel</Button>
        </Stack>

        <Stepper activeStep={activeStep} orientation="vertical">
          {provider.steps.map((step, i) => (
            <Step key={i}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.detail}
                </Typography>

                {isLastStep && !isWhatsApp && (
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

                <Stack direction="row" spacing={1}>
                  {i > 0 && (
                    <Button size="small" onClick={() => setActiveStep(i - 1)}>Back</Button>
                  )}
                  {!isLastStep && (
                    <Button size="small" variant="contained" onClick={() => setActiveStep(i + 1)}>
                      Next
                    </Button>
                  )}
                  {isLastStep && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleFinish}
                      disabled={!isWhatsApp && !token.trim()}
                    >
                      {isWhatsApp ? "Set Up" : "Connect"}
                    </Button>
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

export { PROVIDERS };
export type { ProviderInfo };
