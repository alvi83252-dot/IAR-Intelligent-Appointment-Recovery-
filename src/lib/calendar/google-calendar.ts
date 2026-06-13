import type { Appointment } from "@/types";
import { CALENDLY_BOOKING_URL } from "@/lib/config";
import { formatDate, formatTime } from "@/lib/utils";

export interface CalendarPushResult {
  success: boolean;
  demo: boolean;
  fallback?: boolean;
  provider: "google_calendar" | "calendly" | "ics_only";
  message: string;
  eventId?: string;
  calendlyUrl?: string;
  detail?: string;
}

function calendlyFallbackMessage(): CalendarPushResult {
  if (CALENDLY_BOOKING_URL) {
    return {
      success: true,
      demo: true,
      fallback: true,
      provider: "calendly",
      message: `Use Calendly to add this to your calendar: ${CALENDLY_BOOKING_URL}`,
      calendlyUrl: CALENDLY_BOOKING_URL,
    };
  }
  return {
    success: true,
    demo: true,
    fallback: true,
    provider: "ics_only",
    message: "Calendar sync unavailable — download .ics file below",
  };
}
export async function pushToGoogleCalendar(
  appointment: Appointment,
  attendeeEmail?: string
): Promise<CalendarPushResult> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? process.env.GMAIL_CLIENT_SECRET;
  const refreshToken =
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN ?? process.env.GMAIL_REFRESH_TOKEN;
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  if (!clientId || !clientSecret || !refreshToken) {
    return calendlyFallbackMessage();
  }
  try {
    const { google } = await import("googleapis");
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2 });
    const start = new Date(appointment.dateTime);
    const end = new Date(start.getTime() + appointment.duration * 60_000);

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${appointment.specialty} — ${appointment.providerName}`,
        description: `IAR booking\nSymptoms: ${appointment.symptoms}\nPriority: ${appointment.priorityBand}`,
        location: appointment.location,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 60 },
          ],
        },
      },
    });

    return {
      success: true,
      demo: false,
      provider: "google_calendar",
      message: `Event created in Google Calendar for ${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)}`,
      eventId: event.data.id ?? undefined,
    };
  } catch (err) {
    const fallback = calendlyFallbackMessage();
    return {
      ...fallback,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}