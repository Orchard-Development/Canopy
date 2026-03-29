import { Chip, Tooltip } from "@mui/material";
import type { TokenUsage } from "@/types/chat";

/** Per-million-token pricing (USD). */
const PRICING: Record<string, { input: number; output: number; cacheWrite?: number; cacheRead?: number }> = {
  // Anthropic
  "claude-opus-4-6": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-opus-4-5": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
  // OpenAI
  "gpt-5.4-pro": { input: 30, output: 180 },
  "gpt-5.4": { input: 2.5, output: 15, cacheRead: 0.25 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5, cacheRead: 0.075 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25, cacheRead: 0.02 },
  "gpt-5.3-codex": { input: 1.75, output: 14, cacheRead: 0.175 },
  "gpt-5.3-chat": { input: 1.75, output: 14, cacheRead: 0.175 },
  "gpt-5.2-pro": { input: 21, output: 168 },
  "gpt-5.2-codex": { input: 1.75, output: 14, cacheRead: 0.175 },
  "gpt-5.2": { input: 1.75, output: 14, cacheRead: 0.175 },
  "gpt-5.2-chat": { input: 1.75, output: 14, cacheRead: 0.175 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "o3": { input: 2, output: 8 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  // xAI / Grok
  "grok-4.20-beta": { input: 2, output: 6, cacheRead: 0.2 },
  "grok-4.20-multi-agent-beta": { input: 2, output: 6, cacheRead: 0.2 },
  "grok-4.20-0309-reasoning": { input: 2, output: 6 },
  "grok-4.20-0309-non-reasoning": { input: 2, output: 6 },
  "grok-code-fast-1": { input: 2, output: 6 },
  "grok-3": { input: 3, output: 15 },
  "grok-3-mini": { input: 0.3, output: 0.5 },
  // Google Gemini
  "gemini-3.1-pro-preview": { input: 2, output: 12, cacheRead: 0.2 },
  "gemini-3-flash-preview": { input: 0.5, output: 3, cacheRead: 0.05 },
  "gemini-3.1-flash-lite-preview": { input: 0.25, output: 1.5, cacheRead: 0.025 },
  "gemini-2.5-pro": { input: 1.25, output: 10, cacheRead: 0.3125 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6, cacheRead: 0.0375 },
  "gemini-2.5-flash-lite": { input: 0.075, output: 0.3, cacheRead: 0.01875 },
  // Groq (hosted Llama/Qwen/DeepSeek)
  "llama-4-maverick-17b-128e-instruct": { input: 0.29, output: 0.69 },
  "llama-4-scout-17b-16e-instruct": { input: 0.11, output: 0.19 },
  "qwen-qwq-32b": { input: 0.29, output: 0.39 },
  "deepseek-r1-distill-llama-70b": { input: 0.45, output: 0.89 },
  // OpenRouter -- Qwen (gateway defaults)
  "qwen3-235b-a22b": { input: 0.39, output: 2.34 },
  "qwen3-30b-a3b": { input: 0.1625, output: 1.3 },
  "qwen3.5-397b-a17b": { input: 0.39, output: 2.34 },
  "qwen3.5-122b-a10b": { input: 0.26, output: 2.08 },
  "qwen3.5-35b-a3b": { input: 0.1625, output: 1.3 },
  "qwen3.5-27b": { input: 0.195, output: 1.56 },
  "qwen3.5-9b": { input: 0.05, output: 0.15 },
  "qwen3.5-flash-02-23": { input: 0.065, output: 0.26 },
  "qwen3.5-plus-02-15": { input: 0.26, output: 1.56 },
  "qwen3-max-thinking": { input: 0.78, output: 3.9 },
  "qwen3-coder-next": { input: 0.12, output: 0.75 },
  // OpenRouter -- DeepSeek
  "deepseek-r1": { input: 0.7, output: 2.5 },
  "deepseek-chat-v3-0324": { input: 0.3, output: 0.9 },
  // OpenRouter -- Meta Llama
  "llama-4-maverick": { input: 0.15, output: 0.6 },
  "llama-4-scout": { input: 0.11, output: 0.34 },
  // OpenRouter -- Mistral
  "mistral-small-2603": { input: 0.15, output: 0.6, cacheRead: 0.015 },
  "devstral-2512": { input: 0.4, output: 2, cacheRead: 0.04 },
  "mistral-small-creative": { input: 0.1, output: 0.3, cacheRead: 0.01 },
  // OpenRouter -- NVIDIA
  "nemotron-3-super-120b-a12b": { input: 0.1, output: 0.5 },
  "nemotron-3-nano-30b-a3b": { input: 0.05, output: 0.2 },
  // OpenRouter -- Other providers
  "mimo-v2-pro": { input: 1, output: 3 },
  "mimo-v2-omni": { input: 0.4, output: 2 },
  "mimo-v2-flash": { input: 0.09, output: 0.29 },
  "minimax-m2.7": { input: 0.3, output: 1.2 },
  "minimax-m2.5": { input: 0.19, output: 1.15 },
  "minimax-m2.1": { input: 0.27, output: 0.95 },
  "seed-2.0-lite": { input: 0.25, output: 2 },
  "seed-2.0-mini": { input: 0.1, output: 0.4 },
  "seed-1.6": { input: 0.25, output: 2 },
  "seed-1.6-flash": { input: 0.075, output: 0.3 },
  "mercury-2": { input: 0.25, output: 0.75 },
  "step-3.5-flash": { input: 0.1, output: 0.3 },
  "kimi-k2.5": { input: 0.42, output: 2.2 },
  "solar-pro-3": { input: 0.15, output: 0.6 },
  "palmyra-x5": { input: 0.6, output: 6 },
  "glm-5": { input: 0.72, output: 2.3 },
  "glm-5-turbo": { input: 1.2, output: 4 },
  "glm-4.7": { input: 0.39, output: 1.75 },
  "glm-4.7-flash": { input: 0.06, output: 0.4 },
  // Ollama / local (free)
  "ollama": { input: 0, output: 0 },
};

/** Fallback pricing by provider prefix when exact model isn't in the table. */
const PROVIDER_FALLBACK: Record<string, { input: number; output: number; cacheWrite?: number; cacheRead?: number }> = {
  "claude": { input: 3, output: 15 },
  "gpt": { input: 2.5, output: 15 },
  "grok": { input: 2, output: 6 },
  "gemini": { input: 0.5, output: 3 },
  "llama": { input: 0.15, output: 0.6 },
  "qwen": { input: 0.39, output: 2.34 },
  "deepseek": { input: 0.5, output: 1.5 },
  "mistral": { input: 0.15, output: 0.6 },
  "nemotron": { input: 0.1, output: 0.5 },
  "minimax": { input: 0.3, output: 1.2 },
  "mimo": { input: 0.4, output: 2 },
  "seed": { input: 0.25, output: 2 },
  "glm": { input: 0.39, output: 1.75 },
  "o": { input: 2, output: 8 },
};

/** Strip "provider/" prefix, ":free" suffix, and date suffixes to match pricing keys. */
function normalizeModelId(model: string): string {
  // "qwen/qwen3-235b-a22b:free" -> "qwen/qwen3-235b-a22b"
  let m = model.replace(/:free$/, "");
  // "xai/grok-3" -> "grok-3", "anthropic/claude-sonnet-4-6" -> "claude-sonnet-4-6"
  m = m.includes("/") ? m.split("/").slice(1).join("/") : m;
  // "claude-haiku-4-5-20251001" -> "claude-haiku-4-5"
  return m.replace(/-\d{8,}$/, "");
}

function findPricing(model?: string | null) {
  if (!model) return null;
  // Free variants always cost $0
  if (model.endsWith(":free")) return { input: 0, output: 0 };
  const normalized = normalizeModelId(model);
  // Exact match on normalized
  if (PRICING[normalized]) return PRICING[normalized];
  // Prefix match (e.g. "claude-sonnet-4-6" matches "claude-sonnet-4-6")
  for (const [key, val] of Object.entries(PRICING)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return val;
    }
  }
  // Fallback by model family prefix (e.g. "grok-4.20" -> "grok" -> grok-3 rates)
  for (const [prefix, val] of Object.entries(PROVIDER_FALLBACK)) {
    if (normalized.startsWith(prefix)) return val;
  }
  return null;
}

function estimateCost(usage: TokenUsage, model?: string | null): number | null {
  const pricing = findPricing(model);
  if (!pricing) return null;
  const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
  const cacheWriteCost = pricing.cacheWrite
    ? ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * pricing.cacheWrite
    : 0;
  const cacheReadCost = pricing.cacheRead
    ? ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * pricing.cacheRead
    : 0;
  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

interface CostChipProps {
  usage: TokenUsage | null;
  model?: string | null;
}

export function CostChip({ usage, model }: CostChipProps) {
  if (!usage || (usage.input_tokens === 0 && usage.output_tokens === 0)) return null;

  const cost = estimateCost(usage, model);
  const total = usage.input_tokens + usage.output_tokens;
  const prefix = usage.estimated ? "~" : "";
  const label = cost != null
    ? `${prefix}${formatCost(cost)}`
    : `${prefix}${formatTokens(total)} tokens`;

  const tooltipLines = [
    `Input: ${formatTokens(usage.input_tokens)}`,
    `Output: ${formatTokens(usage.output_tokens)}`,
  ];
  if (usage.cache_creation_input_tokens) {
    tooltipLines.push(`Cache write: ${formatTokens(usage.cache_creation_input_tokens)}`);
  }
  if (usage.cache_read_input_tokens) {
    tooltipLines.push(`Cache read: ${formatTokens(usage.cache_read_input_tokens)}`);
  }
  if (cost != null) {
    tooltipLines.push(`Est. cost: ${formatCost(cost)}`);
  }

  return (
    <Tooltip title={tooltipLines.join(" | ")} arrow>
      <Chip
        label={label}
        size="small"
        variant="outlined"
        sx={{ fontFamily: "monospace", fontSize: 11 }}
      />
    </Tooltip>
  );
}
