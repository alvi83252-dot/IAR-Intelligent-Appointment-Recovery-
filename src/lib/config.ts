export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const DEFAULT_GOOGLE_MEETUP_BOOKING_URL =
  "https://calendar.app.google/PAm4y6BTimvayDrK9";

/** Google Calendar appointment page for booking meetups */
export const GOOGLE_MEETUP_BOOKING_URL =
  process.env.NEXT_PUBLIC_GOOGLE_MEETUP_BOOKING_URL ??
  process.env.GOOGLE_MEETUP_BOOKING_URL ??
  DEFAULT_GOOGLE_MEETUP_BOOKING_URL;

/** @deprecated Use GOOGLE_MEETUP_BOOKING_URL — kept for imports */
export const GOOGLE_CALENDAR_URL = GOOGLE_MEETUP_BOOKING_URL;

export const APP_NAME = "IAR";
export const APP_FULL_NAME = "Intelligent Appointment Recovery";
export const APP_TAGLINE = "AI Agents That Keep Healthcare Moving.";
export const PAS_LEDGER_NAME = "System C IAR";
export const PAS_LEDGER_DESCRIPTION =
  "NHS PAS/EPR ledger — the record system IAR agents read and write. Not replaced; complemented.";

export type AccessMode = "text" | "voice";

export const ACCESS_MODE_STORAGE_KEY = "iar-access-mode";
