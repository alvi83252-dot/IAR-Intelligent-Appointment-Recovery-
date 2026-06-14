import type { Message } from "@ag-ui/core";
import { EventType } from "@ag-ui/core";
import type { BaseEvent } from "@ag-ui/core";
import { generateFallbackReply } from "@/lib/copilot/fallback-replies";
import { IAR_AGENT_PROMPT } from "@/lib/copilot/iar-agent-prompt";
import { openLlmChatCompletion, type OpenLlmMessage } from "@/lib/llm/open-llm";

function textFromMessage(message: Message | undefined): string {
  if (!message || typeof message.content !== "string") return "";
  return message.content;
}

function toOpenLlmMessages(messages: Message[]): OpenLlmMessage[] {
  const history: OpenLlmMessage[] = [{ role: "system", content: IAR_AGENT_PROMPT }];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const text = textFromMessage(message);
    if (!text.trim()) continue;
    history.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content: text,
    });
  }

  return history;
}

async function tryOpenLlmReply(messages: Message[]): Promise<string | null> {
  return openLlmChatCompletion({
    messages: toOpenLlmMessages(messages),
    temperature: 0.6,
    maxTokens: 512,
  });
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

  const llmReply = await tryOpenLlmReply(input.messages);
  const reply = llmReply ?? generateFallbackReply(userText);

  yield {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta: reply,
  } as BaseEvent;

  yield { type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent;
}
