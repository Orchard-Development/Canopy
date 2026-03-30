import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export interface SettingsData {
  ai_provider?: string;
  claude_auth_mode?: string;
  codex_auth_mode?: string;
  anthropic_api_key?: string;
  openai_api_key?: string;
  xai_api_key?: string;
  gemini_api_key?: string;
  groq_api_key?: string;
  openrouter_api_key?: string;
  default_anthropic_model?: string;
  default_openai_model?: string;
  default_xai_model?: string;
  default_gemini_model?: string;
  default_groq_model?: string;
  default_openrouter_model?: string;
  profiler_mode?: string;
  ollama_model?: string;
  default_terminal_project?: string;
  remote_access_enabled?: string;
  tunnel_enabled?: string;
  tunnel_name?: string;
  tunnel_host_auth?: string;
  display_name?: string;
  avatar_base64?: string;
  gateway_enabled?: string;
  gateway_provider?: string;
  model_classify?: string;
  model_internal?: string;
  model_dispatch_agent?: string;
  model_opencode_primary?: string;
  model_opencode_subagent?: string;
}

interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

interface Props {
  settings: SettingsData;
  visible: Record<string, boolean>;
  testing: string | null;
  models: ModelOption[];
  managedProviders: Set<string>;
  isLoggedIn: boolean;
  onUpdate: (key: string, value: string) => void;
  onTestKey: (provider: "anthropic" | "openai" | "xai" | "gemini" | "groq" | "openrouter") => void;
  onToggleVisible: (key: string) => void;
}

function ManagedBadge({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (!isLoggedIn) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Chip label="Not configured" size="small" color="default" />
        <Typography variant="caption" color="text.secondary">
          Sign in to use Orchard keys
        </Typography>
      </Box>
    );
  }
  return <Chip label="Orchard Managed" size="small" color="success" />;
}

function ApiKeyRow(props: {
  label: string;
  visibilityKey: "anthropic" | "openai" | "xai" | "gemini" | "groq" | "openrouter";
  value: string;
  placeholder: string;
  testing: boolean;
  onChange: (value: string) => void;
  onTest: () => void;
  onToggleVisible: () => void;
  visible: boolean;
}) {
  const {
    label,
    visibilityKey,
    value,
    placeholder,
    testing,
    onChange,
    onTest,
    onToggleVisible,
    visible,
  } = props;

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
      <TextField
        fullWidth
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={`toggle ${visibilityKey} key visibility`}
                  onClick={onToggleVisible}
                  edge="end"
                  size="small"
                >
                  {visible ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        variant="outlined"
        size="small"
        disabled={!value || testing}
        onClick={onTest}
        sx={{ minWidth: 80, height: 56 }}
      >
        {testing ? <CircularProgress size={20} /> : "Test"}
      </Button>
    </Box>
  );
}

function ProviderSection(props: {
  title: string;
  description: string;
  authMode: string;
  authModeKey: string;
  apiKeyLabel: string;
  apiKeyValue: string;
  apiKeyPlaceholder: string;
  apiKeySettingKey: string;
  visibilityKey: "anthropic" | "openai" | "xai" | "gemini" | "groq" | "openrouter";
  testing: boolean;
  visible: boolean;
  models: ModelOption[];
  selectedModel: string;
  modelSettingKey: string;
  modelLabel: string;
  showAuthToggle?: boolean;
  isManaged: boolean;
  isLoggedIn: boolean;
  onUpdate: (key: string, value: string) => void;
  onTestKey: () => void;
  onToggleVisible: () => void;
}) {
  const useApiKey = props.authMode === "api_key";
  const showAuthToggle = props.showAuthToggle ?? true;
  const hasByok = !!props.apiKeyValue;
  const showManagedBadge = props.isManaged && !hasByok;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{props.title}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        {props.description}
      </Typography>
      <Stack spacing={1.5}>
        {showManagedBadge && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ManagedBadge isLoggedIn={props.isLoggedIn} />
            {props.isLoggedIn && (
              <Button
                size="small"
                variant="text"
                onClick={() => props.onUpdate(props.apiKeySettingKey, " ")}
                sx={{ fontSize: "0.75rem" }}
              >
                Use your own key
              </Button>
            )}
          </Box>
        )}
        <Collapse in={hasByok || !props.isManaged}>
          <Stack spacing={1.5}>
            <ApiKeyRow
              label={props.apiKeyLabel}
              visibilityKey={props.visibilityKey}
              value={props.apiKeyValue}
              placeholder={props.apiKeyPlaceholder}
              testing={props.testing}
              onChange={(value) => props.onUpdate(props.apiKeySettingKey, value)}
              onTest={props.onTestKey}
              onToggleVisible={props.onToggleVisible}
              visible={props.visible}
            />
            {hasByok && props.isManaged && (
              <Button
                size="small"
                variant="text"
                color="warning"
                onClick={() => props.onUpdate(props.apiKeySettingKey, "")}
                sx={{ alignSelf: "flex-start", fontSize: "0.75rem" }}
              >
                Remove key (revert to Orchard Managed)
              </Button>
            )}
          </Stack>
        </Collapse>
        {props.models.length > 0 && (
          <FormControl fullWidth size="small">
            <InputLabel id={`${props.visibilityKey}-model-label`}>
              {props.modelLabel}
            </InputLabel>
            <Select
              labelId={`${props.visibilityKey}-model-label`}
              value={props.selectedModel}
              label={props.modelLabel}
              onChange={(e) => props.onUpdate(props.modelSettingKey, e.target.value)}
            >
              {props.models.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {showAuthToggle && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch
              checked={!useApiKey}
              onChange={(_, checked) => {
                props.onUpdate(props.authModeKey, checked ? "login" : "api_key");
                if (checked && props.authModeKey === "claude_auth_mode") {
                  props.onUpdate(props.apiKeySettingKey, "");
                }
              }}
              size="small"
            />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Use my subscription (browser login)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                {useApiKey
                  ? "Off -- agents bill to your API key"
                  : "On -- agents bill to your subscription"}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

const FALLBACK_ANTHROPIC: ModelOption[] = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 (best)", provider: "anthropic" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "anthropic" },
];

const FALLBACK_OPENAI: ModelOption[] = [
  { id: "gpt-5.4", label: "GPT 5.4", provider: "openai" },
  { id: "gpt-5.4-pro", label: "GPT 5.4 Pro", provider: "openai" },
  { id: "o3", label: "o3", provider: "openai" },
  { id: "o4-mini", label: "o4 Mini", provider: "openai" },
];

const FALLBACK_XAI: ModelOption[] = [
  { id: "grok-3", label: "Grok 3", provider: "xai" },
  { id: "grok-3-mini", label: "Grok 3 Mini", provider: "xai" },
];

const FALLBACK_GEMINI: ModelOption[] = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", provider: "gemini" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)", provider: "gemini" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
];

const FALLBACK_GROQ: ModelOption[] = [
  { id: "llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick", provider: "groq" },
  { id: "llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout", provider: "groq" },
];

const FALLBACK_OPENROUTER: ModelOption[] = [
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B", provider: "openrouter" },
  { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B", provider: "openrouter" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "openrouter" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", provider: "openrouter" },
];

export function AiProviderCard({
  settings,
  visible,
  testing,
  models,
  managedProviders,
  isLoggedIn,
  onUpdate,
  onTestKey,
  onToggleVisible,
}: Props) {
  const anthropicModels = models.filter((m) => m.provider === "anthropic");
  const openaiModels = models.filter((m) => m.provider === "openai");
  const xaiModels = models.filter((m) => m.provider === "xai");
  const geminiModels = models.filter((m) => m.provider === "gemini");
  const groqModels = models.filter((m) => m.provider === "groq");
  const openrouterModels = models.filter((m) => m.provider === "openrouter");

  const gatewayEnabled = settings.gateway_enabled === "true";
  const gatewayProvider = settings.gateway_provider || "xai";

  // Only show gateway provider options for providers that have API keys or managed keys
  const gatewayProviders = [
    ...(settings.anthropic_api_key || managedProviders.has("anthropic")
      ? [{ id: "anthropic", label: "Anthropic (API Key)" }]
      : []),
    ...(settings.openai_api_key || managedProviders.has("openai")
      ? [{ id: "openai", label: "OpenAI" }]
      : []),
    ...(settings.xai_api_key || managedProviders.has("xai")
      ? [{ id: "xai", label: "xAI (Grok)" }]
      : []),
    ...(settings.gemini_api_key || managedProviders.has("gemini")
      ? [{ id: "gemini", label: "Google Gemini" }]
      : []),
    ...(settings.groq_api_key || managedProviders.has("groq")
      ? [{ id: "groq", label: "Groq (Llama)" }]
      : []),
    ...(settings.openrouter_api_key || managedProviders.has("openrouter")
      ? [{ id: "openrouter", label: "OpenRouter" }]
      : []),
    { id: "ollama", label: "Ollama (Local)" },
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>AI Providers</Typography>
        <Stack spacing={3}>

          {/* Model Gateway toggle */}
          <Box sx={{
            p: 2, borderRadius: 1,
            border: "1px solid",
            borderColor: gatewayEnabled ? "primary.main" : "divider",
            bgcolor: gatewayEnabled ? "action.selected" : "transparent",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Switch
                checked={gatewayEnabled}
                onChange={(_, checked) => onUpdate("gateway_enabled", checked ? "true" : "false")}
                size="small"
              />
              <Box>
                <Typography variant="subtitle2">
                  Route Chat via Gateway
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Route new Claude Code sessions through the selected provider instead of Anthropic (media generation is always available)
                </Typography>
              </Box>
            </Box>
            {gatewayEnabled && gatewayProviders.length > 0 && (
              <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                <InputLabel id="gateway-provider-label">Gateway Provider</InputLabel>
                <Select
                  labelId="gateway-provider-label"
                  value={gatewayProvider}
                  label="Gateway Provider"
                  onChange={(e) => onUpdate("gateway_provider", e.target.value)}
                >
                  {gatewayProviders.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {gatewayEnabled && gatewayProviders.length === 0 && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
                Configure at least one non-Anthropic provider below to use the gateway.
              </Typography>
            )}
          </Box>

          <ProviderSection
            title="Anthropic"
            description="Powers Claude Code sessions. Use your own API key for anonymous usage billed to your account, or leave off to authenticate via browser login."
            authMode={settings.claude_auth_mode ?? "login"}
            authModeKey="claude_auth_mode"
            apiKeyLabel="Anthropic API Key"
            apiKeyValue={settings.anthropic_api_key ?? ""}
            apiKeyPlaceholder="sk-ant-..."
            apiKeySettingKey="anthropic_api_key"
            visibilityKey="anthropic"
            testing={testing === "anthropic"}
            visible={!!visible.anthropic}
            models={anthropicModels.length > 0 ? anthropicModels : FALLBACK_ANTHROPIC}
            selectedModel={settings.default_anthropic_model || "claude-opus-4-6"}
            modelSettingKey="default_anthropic_model"
            modelLabel="Default Model"
            isManaged={managedProviders.has("anthropic")}
            isLoggedIn={isLoggedIn}
            onUpdate={onUpdate}
            onTestKey={() => onTestKey("anthropic")}
            onToggleVisible={() => onToggleVisible("anthropic")}
          />

          <ProviderSection
            title="OpenAI"
            description="Powers Codex sessions. Toggle on to authenticate with your API key instead of browser login."
            authMode={settings.codex_auth_mode ?? "login"}
            authModeKey="codex_auth_mode"
            apiKeyLabel="OpenAI API Key"
            apiKeyValue={settings.openai_api_key ?? ""}
            apiKeyPlaceholder="sk-..."
            apiKeySettingKey="openai_api_key"
            visibilityKey="openai"
            testing={testing === "openai"}
            visible={!!visible.openai}
            models={openaiModels.length > 0 ? openaiModels : FALLBACK_OPENAI}
            selectedModel={settings.default_openai_model || "gpt-5.4"}
            modelSettingKey="default_openai_model"
            modelLabel="Default Model"
            isManaged={managedProviders.has("openai")}
            isLoggedIn={isLoggedIn}
            onUpdate={onUpdate}
            onTestKey={() => onTestKey("openai")}
            onToggleVisible={() => onToggleVisible("openai")}
          />

          <ProviderSection
            title="xAI (Grok)"
            description="Powers Grok sessions. Add your xAI API key to use Grok models."
            authMode="api_key"
            authModeKey="xai_auth_mode"
            apiKeyLabel="xAI API Key"
            apiKeyValue={settings.xai_api_key ?? ""}
            apiKeyPlaceholder="xai-..."
            apiKeySettingKey="xai_api_key"
            visibilityKey="xai"
            testing={testing === "xai"}
            visible={!!visible.xai}
            models={xaiModels.length > 0 ? xaiModels : FALLBACK_XAI}
            selectedModel={settings.default_xai_model || "grok-3-mini"}
            modelSettingKey="default_xai_model"
            modelLabel="Default Model"
            showAuthToggle={false}
            isManaged={managedProviders.has("xai")}
            isLoggedIn={isLoggedIn}
            onUpdate={onUpdate}
            onTestKey={() => onTestKey("xai")}
            onToggleVisible={() => onToggleVisible("xai")}
          />

          <ProviderSection
            title="Google Gemini"
            description="Powers Gemini sessions. Add your Google AI API key to use Gemini models."
            authMode="api_key"
            authModeKey="gemini_auth_mode"
            apiKeyLabel="Gemini API Key"
            apiKeyValue={settings.gemini_api_key ?? ""}
            apiKeyPlaceholder="AIza..."
            apiKeySettingKey="gemini_api_key"
            visibilityKey="gemini"
            testing={testing === "gemini"}
            visible={!!visible.gemini}
            models={geminiModels.length > 0 ? geminiModels : FALLBACK_GEMINI}
            selectedModel={settings.default_gemini_model || "gemini-2.5-pro"}
            modelSettingKey="default_gemini_model"
            modelLabel="Default Model"
            showAuthToggle={false}
            isManaged={managedProviders.has("gemini")}
            isLoggedIn={isLoggedIn}
            onUpdate={onUpdate}
            onTestKey={() => onTestKey("gemini")}
            onToggleVisible={() => onToggleVisible("gemini")}
          />

          <ProviderSection
            title="Groq (Llama)"
            description="Ultra-fast Llama inference. Add your Groq API key to use Llama models."
            authMode="api_key"
            authModeKey="groq_auth_mode"
            apiKeyLabel="Groq API Key"
            apiKeyValue={settings.groq_api_key ?? ""}
            apiKeyPlaceholder="gsk_..."
            apiKeySettingKey="groq_api_key"
            visibilityKey="groq"
            testing={testing === "groq"}
            visible={!!visible.groq}
            models={groqModels.length > 0 ? groqModels : FALLBACK_GROQ}
            selectedModel={settings.default_groq_model || "llama-4-maverick-17b-128e-instruct"}
            modelSettingKey="default_groq_model"
            modelLabel="Default Model"
            showAuthToggle={false}
            isManaged={managedProviders.has("groq")}
            isLoggedIn={isLoggedIn}
            onUpdate={onUpdate}
            onTestKey={() => onTestKey("groq")}
            onToggleVisible={() => onToggleVisible("groq")}
          />

          <ProviderSection
            title="OpenRouter (Qwen, Llama, DeepSeek)"
            description="Access hundreds of models through one API key. Supports Qwen, Llama, DeepSeek, and more."
            authMode="api_key"
            authModeKey="openrouter_auth_mode"
            apiKeyLabel="OpenRouter API Key"
            apiKeyValue={settings.openrouter_api_key ?? ""}
            apiKeyPlaceholder="sk-or-..."
            apiKeySettingKey="openrouter_api_key"
            visibilityKey="openrouter"
            testing={testing === "openrouter"}
            visible={!!visible.openrouter}
            models={openrouterModels.length > 0 ? openrouterModels : FALLBACK_OPENROUTER}
            selectedModel={settings.default_openrouter_model || "qwen/qwen3-235b-a22b"}
            modelSettingKey="default_openrouter_model"
            modelLabel="Default Model"
            showAuthToggle={false}
            isManaged={managedProviders.has("openrouter")}
            isLoggedIn={isLoggedIn}
            onUpdate={onUpdate}
            onTestKey={() => onTestKey("openrouter")}
            onToggleVisible={() => onToggleVisible("openrouter")}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
