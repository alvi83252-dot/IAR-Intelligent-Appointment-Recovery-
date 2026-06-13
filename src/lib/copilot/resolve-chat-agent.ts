import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { IAR_AGENT_PROMPT } from "@/lib/copilot/iar-agent-prompt";
import { iarChatAgent } from "@/lib/copilot/iar-chat-agent";
import { getGeminiApiKey } from "@/lib/gemini/config";

export type ChatAgentKind = "openai" | "anthropic" | "gemini-hybrid" | "builtin";

export function resolveChatAgentKind(): ChatAgentKind {
  const override = process.env.CHAT_MODEL?.trim();

  if (override?.startsWith("openai/") && process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  if (override?.startsWith("anthropic/") && process.env.ANTHROPIC_API_KEY?.trim()) {
    return "anthropic";
  }
  if (process.env.OPENAI_API_KEY?.trim() && (!override || override.startsWith("openai/"))) {
    return "openai";
  }
  if (process.env.ANTHROPIC_API_KEY?.trim() && (!override || override.startsWith("anthropic/"))) {
    return "anthropic";
  }
  if (override?.startsWith("google/") && getGeminiApiKey()) {
    return "gemini-hybrid";
  }
  if (getGeminiApiKey()) {
    return "gemini-hybrid";
  }

  return "builtin";
}

export function createDefaultChatAgent(): BuiltInAgent {
  const kind = resolveChatAgentKind();
  const override = process.env.CHAT_MODEL?.trim();

  if (kind === "openai") {
    return new BuiltInAgent({
      model: override?.startsWith("openai/") ? override : "openai/gpt-4o-mini",
      prompt: IAR_AGENT_PROMPT,
    });
  }

  if (kind === "anthropic") {
    return new BuiltInAgent({
      model: override?.startsWith("anthropic/") ? override : "anthropic/claude-3-5-haiku",
      prompt: IAR_AGENT_PROMPT,
    });
  }

  return new BuiltInAgent({
    type: "custom",
    factory: iarChatAgent,
  });
}

export function chatAgentProviderLabel(kind: ChatAgentKind = resolveChatAgentKind()): string {
  switch (kind) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic Claude";
    case "gemini-hybrid":
      return "Google Gemini";
    case "builtin":
      return "Built-in assistant";
  }
}
