import { NextResponse } from "next/server";
import { AGENT_CARDS } from "@/agents/agent-cards";

export async function GET() {
  return NextResponse.json({
    agents: AGENT_CARDS,
    protocol: "A2A",
    demoMode: true,
  });
}
