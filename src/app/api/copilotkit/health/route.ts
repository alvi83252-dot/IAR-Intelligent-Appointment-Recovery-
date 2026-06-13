import { NextResponse } from "next/server";
import { checkGeminiHealth } from "@/lib/copilot/gemini-health";
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
      provider: "Google Gemini",
      mode: "fallback",
    });
  }

  if (kind === "openai" || kind === "anthropic") {
    const model = resolveChatModel();
    return NextResponse.json({
      online: true,
      provider: chatAgentProviderLabel(kind),
      model,
      message: `Using ${chatModelLabel(model)} (${model})`,
    });
  }

  const health = await checkGeminiHealth();
  if (health.ok) {
    return NextResponse.json({
      online: true,
      provider: "Google Gemini",
      model: health.model,
      mode: "gemini",
    });
  }

  return NextResponse.json({
    online: true,
    provider: "Google Gemini",
    mode: "fallback",
    geminiStatus: health.code,
  });
}
