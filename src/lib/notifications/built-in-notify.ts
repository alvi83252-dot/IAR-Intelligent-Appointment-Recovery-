import type { Appointment } from "@/types";
import { GOOGLE_MEETUP_BOOKING_URL } from "@/lib/config";
import { formatDate, formatTime } from "@/lib/utils";
import { generateFullCalendarPackage } from "@/lib/calendar";

export interface PatientContact {
  name: string;
  email: string;
  phone: string;
}

export interface NotificationPayload {
  contact: PatientContact;
  appointment: Appointment;
}

export interface NotificationResult {
  channel: "sms" | "email";
  success: boolean;
  demo: boolean;
  message: string;
  detail?: string;
  /** Client can open sms: / mailto: links when demo is true */
  actionUrl?: string;
}

export function buildSmsBody(appointment: Appointment, contact: PatientContact): string {
  const when = `${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)}`;
  return `IAR: Hi ${contact.name}, your GP appointment with ${appointment.providerName} is confirmed for ${when} at ${appointment.location}. Book meetup: ${GOOGLE_MEETUP_BOOKING_URL} Reply HELP for support.`;
}

export function buildEmailPlainText(
  appointment: Appointment,
  contact: PatientContact
): string {
  const subject = `IAR — Appointment confirmed with ${appointment.providerName}`;
  const when = `${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)}`;
  return [
    subject,
    "",
    `Hi ${contact.name},`,
    "",
    "Your agents have secured your GP appointment:",
    `- Clinician: ${appointment.providerName}`,
    `- When: ${when}`,
    `- Location: ${appointment.location}`,
    `- Priority: ${appointment.priorityBand}`,
    "",
    `Symptoms: ${appointment.symptoms}`,
    "",
    `Book meetup: ${GOOGLE_MEETUP_BOOKING_URL}`,
    "",
    "Download the .ics calendar file from your confirmation page.",
  ].join("\n");
}

export function buildEmailHtml(appointment: Appointment, contact: PatientContact): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2>Appointment confirmed — IAR</h2>
      <p>Hi ${contact.name},</p>
      <p>Your agents have secured your GP appointment:</p>
      <ul>
        <li><strong>Clinician:</strong> ${appointment.providerName}</li>
        <li><strong>When:</strong> ${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)}</li>
        <li><strong>Location:</strong> ${appointment.location}</li>
        <li><strong>Priority:</strong> ${appointment.priorityBand}</li>
      </ul>
      <p>Symptoms noted: ${appointment.symptoms}</p>
      <p><a href="${GOOGLE_MEETUP_BOOKING_URL}">Book your meetup on Google Calendar</a> — download the .ics file on your confirmation page for other calendar apps.</p>
      <p style="color:#666;font-size:12px;">Intelligent Appointment Recovery</p>
    </div>
  `;
}

export function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s()-]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("0") && compact.length === 11) return `+44${compact.slice(1)}`;
  return compact;
}

export function buildSmsActionUrl(phone: string, body: string): string {
  const to = normalizePhone(phone);
  return `sms:${encodeURIComponent(to)}?body=${encodeURIComponent(body)}`;
}

export function buildEmailActionUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Built-in delivery — no Twilio/Gmail; shows on confirmation + dashboard */
export function sendBuiltInSms(payload: NotificationPayload): NotificationResult {
  const { contact, appointment } = payload;
  const body = buildSmsBody(appointment, contact);
  const to = normalizePhone(contact.phone);

  return {
    channel: "sms",
    success: true,
    demo: true,
    message: `SMS confirmation ready for ${to}`,
    detail: body,
    actionUrl: buildSmsActionUrl(contact.phone, body),
  };
}

export function sendBuiltInEmail(payload: NotificationPayload): NotificationResult {
  const { contact, appointment } = payload;
  const subject = `IAR — Appointment confirmed with ${appointment.providerName}`;
  const plain = buildEmailPlainText(appointment, contact);

  return {
    channel: "email",
    success: true,
    demo: true,
    message: `Email confirmation ready for ${contact.email}`,
    detail: plain,
    actionUrl: buildEmailActionUrl(contact.email, subject, plain),
  };
}

export function getIcsAttachmentPreview(appointment: Appointment): string {
  return generateFullCalendarPackage(appointment);
}
