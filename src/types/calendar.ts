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
