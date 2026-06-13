import type { Appointment } from "@/types";
import type { CalendarPushResult } from "@/lib/calendar/google-calendar";

export async function pushBookingToGoogleCalendar(
  appointment: Appointment,
  email?: string
): Promise<CalendarPushResult | null> {
  try {
    const response = await fetch("/api/calendar/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment, email }),
    });
    return (await response.json()) as CalendarPushResult;
  } catch {
    return null;
  }
}

export function calendarConfirmationLine(result: CalendarPushResult | null): string {
  if (!result) {
    return "Connect Google at /setup to auto-add appointments to your calendar.";
  }
  if (result.provider === "google_calendar") {
    return result.eventUrl
      ? `Added to your Google Calendar: ${result.eventUrl}`
      : result.message;
  }
  return result.message;
}
