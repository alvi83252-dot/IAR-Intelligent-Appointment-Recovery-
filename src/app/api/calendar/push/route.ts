import { NextResponse } from "next/server";
import type { Appointment } from "@/types";
import { pushToGoogleCalendar } from "@/lib/calendar/google-calendar";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      appointment?: Appointment;
      email?: string;
    };

    if (!body.appointment?.id) {
      return NextResponse.json({ error: "appointment is required" }, { status: 400 });
    }

    const result = await pushToGoogleCalendar(body.appointment, body.email);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calendar push failed" },
      { status: 500 }
    );
  }
}
