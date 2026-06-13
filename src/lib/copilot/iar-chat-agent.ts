import type { BaseEvent, Message } from "@ag-ui/core";
import { EventType } from "@ag-ui/core";
import { externalFetch } from "@/lib/external-fetch";
import { generateFallbackReply } from "@/lib/copilot/fallback-replies";
import { IAR_AGENT_PROMPT } from "@/lib/copilot/iar-agent-prompt";
import { getGeminiApiKey, getGeminiModel } from "@/lib/gemini/config";

function textFromMessage(message: Message | undefined): string {
  if (!message || typeof message.content !== "string") return "";
  return message.content;
}

function conversationHistory(messages: Message[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: textFromMessage(message) }],
    }))
    .filter((entry) => entry.parts[0]?.text.trim());
}

async function tryGeminiReply(messages: Message[]): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const model = getGeminiModel("chat");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const history = conversationHistory(messages.slice(0, -1));
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const lastText = textFromMessage(lastUser);
  if (!lastText.trim()) return null;

  try {
    const response = await externalFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: IAR_AGENT_PROMPT }] },
        contents: [
          ...history,
          { role: "user", parts: [{ text: lastText }] },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function* iarChatAgent({
  input,
  abortSignal,
}: {
  input: { messages: Message[] };
  abortSignal: AbortSignal;
}): AsyncIterable<BaseEvent> {
  const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
  const userText = textFromMessage(lastUserMessage);
  const messageId = crypto.randomUUID();

  yield {
    type: EventType.TEXT_MESSAGE_START,
    messageId,
    role: "assistant",
  } as BaseEvent;

  if (abortSignal.aborted) return;

  const geminiReply = await tryGeminiReply(input.messages);
  const reply = geminiReply ?? generateFallbackReply(userText);

  yield {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta: reply,
  } as BaseEvent;

  yield { type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent;
}
