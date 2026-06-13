import { NextResponse } from "next/server";
import type { Appointment, PatientContact } from "@/types";
import { sendBookingNotifications } from "@/lib/notifications/booking-notify";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      contact?: PatientContact;
      appointment?: Appointment;
    };

    const contact = body.contact;
    const appointment = body.appointment;

    if (!contact?.email || !contact?.phone || !contact?.name) {
      return NextResponse.json(
        { error: "contact.name, contact.email, and contact.phone are required" },
        { status: 400 }
      );
    }

    if (!appointment?.id) {
      return NextResponse.json({ error: "appointment is required" }, { status: 400 });
    }

    const results = await sendBookingNotifications({ contact, appointment });

    return NextResponse.json({
      ok: results.every((r) => r.success),
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Notification failed" },
      { status: 500 }
    );
  }
}
