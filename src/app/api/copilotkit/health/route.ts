import { NextResponse } from "next/server";
import { checkLlmHealth } from "@/lib/copilot/gemini-health";
import {
  chatAgentProviderLabel,
  resolveChatAgentKind,
} from "@/lib/copilot/resolve-chat-agent";
import { chatModelLabel, resolveChatModel } from "@/lib/copilot/resolve-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const kind = resolveChatAgentKind();

  if (kind === "builtin") {
    return NextResponse.json({
      online: true,
      provider: "Built-in assistant",
      mode: "fallback",
      message: "FreeLLMAPI not configured — using rule-based replies.",
    });
  }

  if (kind === "openai" || kind === "anthropic") {
    const model = resolveChatModel();
    const health = kind === "openai" ? await checkLlmHealth() : { ok: true as const };

    if (kind === "openai" && !health.ok) {
      return NextResponse.json({
        online: true,
        provider: chatAgentProviderLabel(kind),
        mode: "fallback",
        message: health.message,
        llmStatus: health.code,
      });
    }

    return NextResponse.json({
      online: true,
      provider: chatAgentProviderLabel(kind),
      model,
      mode: "llm",
      message: `Using ${chatModelLabel(model)} (${model})`,
    });
  }

  return NextResponse.json({
    online: true,
    provider: "Built-in assistant",
    mode: "fallback",
  });
}
