import { externalFetch } from "@/lib/external-fetch";

export interface OpenLlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Sync FreeLLMAPI env into OPENAI_* for CopilotKit BuiltInAgent / @ai-sdk/openai. */
export function bootstrapOpenLlmEnv(): void {
  const key =
    process.env.FREELLMAPI_API_KEY?.trim() ?? process.env.OPENAI_API_KEY?.trim();
  const base =
    process.env.FREELLMAPI_BASE_URL?.trim() ??
    process.env.OPENAI_BASE_URL?.trim() ??
    "http://localhost:3001/v1";

  if (key && !process.env.OPENAI_API_KEY?.trim()) {
    process.env.OPENAI_API_KEY = key;
  }
  if (base && !process.env.OPENAI_BASE_URL?.trim()) {
    process.env.OPENAI_BASE_URL = base;
  }
}

export function getOpenLlmApiKey(): string | null {
  bootstrapOpenLlmEnv();
  return (
    process.env.FREELLMAPI_API_KEY?.trim() ??
    process.env.OPENAI_API_KEY?.trim() ??
    null
  );
}

export function getOpenLlmBaseUrl(): string {
  bootstrapOpenLlmEnv();
  return (
    process.env.FREELLMAPI_BASE_URL?.trim() ??
    process.env.OPENAI_BASE_URL?.trim() ??
    "http://localhost:3001/v1"
  ).replace(/\/$/, "");
}

export function getOpenLlmModel(purpose: "chat" | "research" = "chat"): string {
  const purposeModel =
    purpose === "research"
      ? process.env.RESEARCH_AGENT_MODEL?.trim()
      : process.env.LLM_MODEL?.trim();

  const fromChat = process.env.CHAT_MODEL?.trim()?.replace(/^openai\//, "");

  return (
    purposeModel ??
    fromChat ??
    process.env.FREELLMAPI_MODEL?.trim() ??
    "llama-3.3-70b-versatile"
  );
}

export function isOpenLlmConfigured(): boolean {
  return !!getOpenLlmApiKey();
}

export function openLlmChatModelId(): string {
  const override = process.env.CHAT_MODEL?.trim();
  if (override?.startsWith("openai/")) return override;
  return `openai/${getOpenLlmModel("chat")}`;
}

export async function openLlmChatCompletion(options: {
  messages: OpenLlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string | null> {
  const apiKey = getOpenLlmApiKey();
  if (!apiKey) return null;

  const url = `${getOpenLlmBaseUrl()}/chat/completions`;
  const model = options.model ?? getOpenLlmModel("chat");

  try {
    const response = await externalFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 512,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export type OpenLlmHealthStatus =
  | { ok: true; model: string; baseUrl: string }
  | { ok: false; code: "missing_key" | "unreachable" | "unknown"; message: string };

export async function checkOpenLlmHealth(): Promise<OpenLlmHealthStatus> {
  const apiKey = getOpenLlmApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "missing_key",
      message: "Set FREELLMAPI_API_KEY or OPENAI_API_KEY in .env.local",
    };
  }

  const model = getOpenLlmModel("chat");
  const baseUrl = getOpenLlmBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK only." }],
        max_tokens: 8,
      }),
    });

    if (response.ok) {
      return { ok: true, model, baseUrl };
    }

    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    return {
      ok: false,
      code: "unknown",
      message: data.error?.message ?? `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      code: "unreachable",
      message:
        err instanceof Error
          ? err.message
          : `Could not reach FreeLLMAPI at ${baseUrl}`,
    };
  }
}
