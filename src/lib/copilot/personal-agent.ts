import type { BaseEvent, Message } from "@ag-ui/core";
import { EventType } from "@ag-ui/core";

function textFromMessage(message: Message | undefined): string {
  if (!message || typeof message.content !== "string") return "";
  return message.content;
}

function isAppointmentRequest(text: string): boolean {
  return /\b(appointment|gp|doctor|book|rebook|slot|symptom|pain|cough|fever)\b/i.test(text);
}

export async function* personalAgent({ input, abortSignal }: {
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

  if (/selected|booked|confirmed/i.test(userText)) {
    yield {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta:
        "That slot is confirmed in the PAS ledger and synced to Google Calendar when you are signed in at /setup. I'll keep watching for calendar conflicts.",
    } as BaseEvent;
    yield { type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent;
    return;
  }

  if (!isAppointmentRequest(userText)) {
    yield {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta:
        "Tell me what you need the GP appointment for and any availability constraints. I will generate options you can choose from.",
    } as BaseEvent;
    yield { type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent;
    return;
  }

  yield {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta:
      "I can help with that. I will check priority and generate appointment options for you to choose from.",
  } as BaseEvent;
  yield { type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent;

  if (abortSignal.aborted) return;

  const toolCallId = crypto.randomUUID();
  yield {
    type: EventType.TOOL_CALL_START,
    toolCallId,
    toolCallName: "generateAppointmentChoices",
    parentMessageId: messageId,
  } as BaseEvent;
  yield {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId,
    delta: JSON.stringify({ requestText: userText }),
  } as BaseEvent;
  yield { type: EventType.TOOL_CALL_END, toolCallId } as BaseEvent;
}
