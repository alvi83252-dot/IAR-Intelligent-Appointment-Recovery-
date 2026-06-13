/**
 * Picks the CopilotKit BuiltInAgent model from env.
 * Set CHAT_MODEL to override (e.g. openai/gpt-4o-mini).
 */
export function resolveChatModel(): string {
  const override = process.env.CHAT_MODEL?.trim();
  if (override) return override;

  const googleKey = process.env.GOOGLE_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (googleKey) return "google/gemini-2.5-flash";
  if (openaiKey) return "openai/gpt-4o-mini";
  if (anthropicKey) return "anthropic/claude-3-5-haiku";

  return "google/gemini-2.5-flash";
}

export function chatModelLabel(model: string): string {
  if (model.startsWith("google/")) return "Google Gemini";
  if (model.startsWith("openai/")) return "OpenAI";
  if (model.startsWith("anthropic/")) return "Anthropic Claude";
  return model;
}
