/**
 * Picks the CopilotKit BuiltInAgent model from env.
 * Defaults to FreeLLMAPI (OpenAI-compatible) when configured.
 */
import {
  bootstrapOpenLlmEnv,
  isOpenLlmConfigured,
  openLlmChatModelId,
} from "@/lib/llm/open-llm";

export function resolveChatModel(): string {
  bootstrapOpenLlmEnv();

  const override = process.env.CHAT_MODEL?.trim();
  if (override) return override;

  if (isOpenLlmConfigured()) return openLlmChatModelId();

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) return "anthropic/claude-3-5-haiku";

  return "builtin/fallback";
}

export function chatModelLabel(model: string): string {
  if (model.startsWith("openai/")) {
    return isOpenLlmConfigured() ? "FreeLLMAPI (local)" : "OpenAI";
  }
  if (model.startsWith("anthropic/")) return "Anthropic Claude";
  if (model.startsWith("builtin/")) return "Built-in assistant";
  return model;
}
