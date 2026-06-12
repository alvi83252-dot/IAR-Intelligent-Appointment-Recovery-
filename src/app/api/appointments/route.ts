import { NextResponse } from "next/server";
import { INITIAL_APPOINTMENTS } from "@/services/mock-data";

export async function GET() {
  return NextResponse.json({ appointments: INITIAL_APPOINTMENTS });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { symptoms, availability } = body;

  if (!symptoms) {
    return NextResponse.json({ error: "Symptoms required" }, { status: 400 });
  }

  return NextResponse.json({
    message: "Use client-side orchestrator in demo mode",
    hint: "POST to /api/priority for assessment, then book via UI",
    received: { symptoms, availability },
  });
}
