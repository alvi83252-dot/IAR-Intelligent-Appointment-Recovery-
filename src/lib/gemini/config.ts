/** Shared Gemini env — supports both IAR (.env.local) and A2A agent naming. */
export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() ??
    process.env.GOOGLE_API_KEY?.trim() ??
    null
  );
}

export function getGeminiModel(purpose: "chat" | "research" = "research"): string {
  const purposeModel =
    purpose === "research"
      ? process.env.RESEARCH_AGENT_MODEL?.trim()
      : process.env.LLM_MODEL?.trim();

  const raw =
    purposeModel ??
    process.env.LLM_MODEL?.trim() ??
    process.env.CHAT_MODEL?.trim()?.replace(/^google\//, "") ??
    "gemini-2.0-flash";

  const normalized = raw.replace(/^google\//, "").replace(/^gemini\//, "");

  const aliases: Record<string, string> = {
    "gemini-3.5-flash": "gemini-2.0-flash",
    "gemini-3-flash": "gemini-2.0-flash",
  };

  return aliases[normalized] ?? normalized;
}
