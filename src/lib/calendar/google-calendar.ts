import type { Appointment } from "@/types";
import { GOOGLE_MEETUP_BOOKING_URL } from "@/lib/config";
import { getGoogleCredentials } from "@/lib/integrations/credentials";
import { formatDate, formatTime } from "@/lib/utils";

export interface CalendarPushResult {
  success: boolean;
  provider: "google_calendar" | "google_meetup" | "ics_only";
  message: string;
  eventId?: string;
  eventUrl?: string;
  meetupBookingUrl?: string;
  calendarUrl?: string;
  detail?: string;
}

function meetupBookingResult(appointment: Appointment, extra?: Partial<CalendarPushResult>): CalendarPushResult {
  const when = `${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)}`;

  return {
    success: true,
    provider: "google_meetup",
    message: `Book or view your meetup on Google Calendar (${when}).`,
    meetupBookingUrl: GOOGLE_MEETUP_BOOKING_URL,
    calendarUrl: GOOGLE_MEETUP_BOOKING_URL,
    ...extra,
  };
}

export async function pushToGoogleCalendar(
  appointment: Appointment,
  attendeeEmail?: string
): Promise<CalendarPushResult> {
  const google = getGoogleCredentials();
  const when = `${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)}`;

  if (!google) {
    return meetupBookingResult(appointment, {
      detail:
        "Optional: connect Google OAuth at /setup to auto-create calendar events. Meetup booking link is ready below.",
    });
  }

  const { clientId, clientSecret, refreshToken, calendarId = "primary" } = google;

  try {
    const { google: googleapis } = await import("googleapis");
    const oauth2 = new googleapis.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });

    const calendar = googleapis.calendar({ version: "v3", auth: oauth2 });
    const start = new Date(appointment.dateTime);
    const end = new Date(start.getTime() + appointment.duration * 60_000);

    const event = await calendar.events.insert({
      calendarId,
      sendUpdates: attendeeEmail ? "all" : "none",
      requestBody: {
        summary: `${appointment.specialty} — ${appointment.providerName}`,
        description: `IAR booking\nSymptoms: ${appointment.symptoms}\nPriority: ${appointment.priorityBand}\nMeetup: ${GOOGLE_MEETUP_BOOKING_URL}`,
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

    const eventUrl = event.data.htmlLink ?? undefined;
    const inviteNote = attendeeEmail
      ? ` A calendar invite was sent to ${attendeeEmail}.`
      : "";

    return {
      success: true,
      provider: "google_calendar",
      message: `Added to Google Calendar for ${when}.${inviteNote} Use the meetup link to book or manage your slot.`,
      eventId: event.data.id ?? undefined,
      eventUrl,
      meetupBookingUrl: GOOGLE_MEETUP_BOOKING_URL,
      calendarUrl: eventUrl ?? GOOGLE_MEETUP_BOOKING_URL,
    };
  } catch (err) {
    return meetupBookingResult(appointment, {
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
