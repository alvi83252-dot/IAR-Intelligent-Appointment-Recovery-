import { NextResponse } from "next/server";
import { a2aBus } from "@/agents/a2a-bus";
import type { A2ATask, AgentId } from "@/types";

export async function GET() {
  return NextResponse.json({
    messages: a2aBus.getMessages(),
    supportedTasks: [
      "appointment.request",
      "appointment.confirm",
      "priority.assess",
      "swap.propose",
      "swap.respond",
      "overflow.request",
      "overflow.respond",
      "disruption.notify",
      "calendar.sync",
    ],
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { from, to, task, payload } = body as {
    from: AgentId;
    to: AgentId | "broadcast";
    task: A2ATask;
    payload: Record<string, unknown>;
  };

  if (!from || !to || !task) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const message = await a2aBus.send(from, to, task, payload ?? {});
  return NextResponse.json({ message });
}
