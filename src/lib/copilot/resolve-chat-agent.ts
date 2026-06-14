import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { IAR_AGENT_PROMPT } from "@/lib/copilot/iar-agent-prompt";
import { iarChatAgent } from "@/lib/copilot/iar-chat-agent";
import {
  bootstrapOpenLlmEnv,
  isOpenLlmConfigured,
  openLlmChatModelId,
} from "@/lib/llm/open-llm";

export type ChatAgentKind = "openai" | "anthropic" | "open-llm" | "builtin";

export function resolveChatAgentKind(): ChatAgentKind {
  bootstrapOpenLlmEnv();

  const override = process.env.CHAT_MODEL?.trim();

  if (isOpenLlmConfigured()) {
    return "openai";
  }
  if (override?.startsWith("openai/") && process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  if (override?.startsWith("anthropic/") && process.env.ANTHROPIC_API_KEY?.trim()) {
    return "anthropic";
  }
  if (process.env.ANTHROPIC_API_KEY?.trim() && (!override || override.startsWith("anthropic/"))) {
    return "anthropic";
  }

  return "builtin";
}

export function createDefaultChatAgent(): BuiltInAgent {
  const kind = resolveChatAgentKind();
  const override = process.env.CHAT_MODEL?.trim();

  if (kind === "openai") {
    return new BuiltInAgent({
      model: override?.startsWith("openai/") ? override : openLlmChatModelId(),
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
      return isOpenLlmConfigured() ? "FreeLLMAPI (local)" : "OpenAI";
    case "anthropic":
      return "Anthropic Claude";
    case "open-llm":
      return "FreeLLMAPI (local)";
    case "builtin":
      return "Built-in assistant";
  }
}
