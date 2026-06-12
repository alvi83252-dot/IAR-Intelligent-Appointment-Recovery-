import type { A2AMessage, A2ATask, AgentId } from "@/types";
import { generateId } from "@/lib/utils";

type MessageHandler = (message: A2AMessage) => void | Promise<void>;

class A2ABus {
  private messages: A2AMessage[] = [];
  private handlers: Map<AgentId, MessageHandler[]> = new Map();
  private listeners: ((messages: A2AMessage[]) => void)[] = [];

  subscribe(listener: (messages: A2AMessage[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.messages]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  registerHandler(agentId: AgentId, handler: MessageHandler): void {
    const existing = this.handlers.get(agentId) ?? [];
    this.handlers.set(agentId, [...existing, handler]);
  }

  async send(
    from: AgentId,
    to: AgentId | "broadcast",
    task: A2ATask,
    payload: Record<string, unknown>
  ): Promise<A2AMessage> {
    const message: A2AMessage = {
      id: generateId("a2a"),
      timestamp: new Date().toISOString(),
      from,
      to,
      task,
      payload,
      status: "sent",
    };

    this.messages = [...this.messages, message];
    this.notify();

    await this.delay(300);

    message.status = "received";
    this.messages = this.messages.map((m) => (m.id === message.id ? message : m));
    this.notify();

    const targets: AgentId[] =
      to === "broadcast" ? ["personal", "front-desk", "research"] : [to];

    for (const target of targets) {
      const handlers = this.handlers.get(target) ?? [];
      for (const handler of handlers) {
        await handler(message);
      }
    }

    await this.delay(200);
    message.status = "processed";
    this.messages = this.messages.map((m) => (m.id === message.id ? message : m));
    this.notify();

    return message;
  }

  getMessages(): A2AMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
    this.notify();
  }

  private notify(): void {
    const snapshot = [...this.messages];
    this.listeners.forEach((l) => l(snapshot));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const a2aBus = new A2ABus();
