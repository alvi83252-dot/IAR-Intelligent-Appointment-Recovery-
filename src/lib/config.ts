export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  process.env.DEMO_MODE === "true" ||
  true;

export const APP_NAME = "IAR";
export const APP_FULL_NAME = "Intelligent Appointment Recovery";
export const APP_TAGLINE = "AI Agents That Keep Healthcare Moving.";
export const PAS_LEDGER_NAME = "System C IAR";
export const PAS_LEDGER_DESCRIPTION =
  "NHS PAS/EPR ledger — the record system IAR agents read and write. Not replaced; complemented.";

export type AccessMode = "text" | "voice";

export const ACCESS_MODE_STORAGE_KEY = "iar-access-mode";

export const DEFAULT_CALENDLY_BOOKING_URL =
  "https://calendly.com/alvifaizan695/new-meeting";

export const CALENDLY_BOOKING_URL =
  process.env.NEXT_PUBLIC_CALENDLY_BOOKING_URL ??
  process.env.CALENDLY_BOOKING_URL ??
  DEFAULT_CALENDLY_BOOKING_URL;
