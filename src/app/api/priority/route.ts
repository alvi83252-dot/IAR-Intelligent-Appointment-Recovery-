import { NextResponse } from "next/server";
import { assessPriorityAsync } from "@/lib/priority/gemini-assess";

export async function POST(request: Request) {
  const body = await request.json();
  const { symptoms, waitDays, context } = body;

  if (!symptoms) {
    return NextResponse.json({ error: "Symptoms required" }, { status: 400 });
  }

  const assessment = await assessPriorityAsync(symptoms, waitDays ?? 0, context);
  return NextResponse.json({ assessment });
}
