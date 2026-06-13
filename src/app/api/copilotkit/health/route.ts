import { NextResponse } from "next/server";
import { checkGeminiHealth } from "@/lib/copilot/gemini-health";
import { chatModelLabel, resolveChatModel } from "@/lib/copilot/resolve-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const model = resolveChatModel();
  const provider = chatModelLabel(model);

  if (!model.startsWith("google/")) {
    return NextResponse.json({
      online: true,
      provider,
      model,
      message: `Using ${provider} (${model})`,
    });
  }

  const health = await checkGeminiHealth();
  if (health.ok) {
    return NextResponse.json({
      online: true,
      provider: "Google Gemini",
      model: health.model,
    });
  }

  return NextResponse.json({
    online: false,
    provider: "Google Gemini",
    code: health.code,
    message: health.message,
    billingUrl: "https://aistudio.google.com/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs/billing#prepay",
  });
}
