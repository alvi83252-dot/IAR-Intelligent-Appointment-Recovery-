import { EventType, type BaseEvent, type Message } from "@ag-ui/core";
import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

export const runtime = "nodejs";

function textFromMessage(message: Message | undefined): string {
  if (!message || typeof message.content !== "string") return "";
  return message.content;
}

function isAppointmentRequest(text: string): boolean {
  return /\b(appointment|gp|doctor|book|rebook|slot|symptom|pain|cough|fever)\b/i.test(text);
}

async function* personalAgent({ input, abortSignal }: any): AsyncIterable<BaseEvent> {
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
        "That slot is confirmed in the PAS ledger. I have added it to the timeline and will keep watching for calendar conflicts.",
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

const runtimeInstance = new CopilotRuntime({
  agents: {
    personal: new BuiltInAgent({
      type: "custom",
      factory: personalAgent,
    }),
  },
});

const handler = createCopilotRuntimeHandler({
  runtime: runtimeInstance,
  basePath: "/api/copilotkit",
});

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
