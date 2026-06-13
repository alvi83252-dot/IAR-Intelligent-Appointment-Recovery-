export type GeminiHealthStatus =
  | { ok: true; model: string }
  | { ok: false; code: "missing_key" | "quota_depleted" | "network_error" | "unknown"; message: string };

export async function checkGeminiHealth(): Promise<GeminiHealthStatus> {
  const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    return {
      ok: false,
      code: "missing_key",
      message: "GOOGLE_API_KEY (or GEMINI_API_KEY) is not set in .env / .env.local",
    };
  }

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reply with OK only." }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; status?: string; code?: number };
    };

    if (response.ok) {
      return { ok: true, model };
    }

    const detail = data.error?.message ?? `HTTP ${response.status}`;
    const lower = detail.toLowerCase();

    if (
      response.status === 429 ||
      lower.includes("quota") ||
      lower.includes("depleted") ||
      lower.includes("billing") ||
      lower.includes("prepay")
    ) {
      return {
        ok: false,
        code: "quota_depleted",
        message:
          "Gemini prepaid credits are depleted. Add billing at Google AI Studio, or set OPENAI_API_KEY / CHAT_MODEL in .env.local for another provider.",
      };
    }

    return { ok: false, code: "unknown", message: detail };
  } catch (err) {
    return {
      ok: false,
      code: "network_error",
      message: err instanceof Error ? err.message : "Could not reach Gemini API",
    };
  }
}

export function isQuotaErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("depleted") ||
    lower.includes("billing") ||
    lower.includes("prepay") ||
    lower.includes("429")
  );
}
