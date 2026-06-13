import type { Appointment } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { generateFullCalendarPackage } from "@/lib/calendar";
import { externalFetch } from "@/lib/external-fetch";

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
  fallback?: boolean;
  message: string;
  detail?: string;
}

function buildSmsBody(appointment: Appointment, contact: PatientContact): string {
  return `IAR: Hi ${contact.name}, your GP appointment with ${appointment.providerName} is confirmed for ${formatDate(appointment.dateTime)} at ${formatTime(appointment.dateTime)} at ${appointment.location}. Reply HELP for support.`;
}

function buildEmailHtml(appointment: Appointment, contact: PatientContact): string {
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
      <p>A calendar file (.ics) is attached when Gmail is configured.</p>
      <p style="color:#666;font-size:12px;">Intelligent Appointment Recovery — demo notification</p>
    </div>
  `;
}

export async function sendSms(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const { contact, appointment } = payload;
  const body = buildSmsBody(appointment, contact);

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return {
      channel: "sms",
      success: true,
      demo: true,
      message: `Demo SMS logged for ${contact.phone}`,
      detail: body,
    };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    To: contact.phone,
    From: from,
    Body: body,
  });

  try {
    const response = await externalFetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return {
        channel: "sms",
        success: true,
        demo: true,
        fallback: true,
        message: `SMS could not send — confirmation shown in app for ${contact.phone}`,
        detail: detail || body,
      };
    }

    return {
      channel: "sms",
      success: true,
      demo: false,
      message: `SMS sent to ${contact.phone}`,
    };
  } catch (err) {
    return {
      channel: "sms",
      success: true,
      demo: true,
      fallback: true,
      message: `SMS unavailable — confirmation saved in app for ${contact.phone}`,
      detail: err instanceof Error ? err.message : body,
    };
  }
}

export async function sendEmail(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const { contact, appointment } = payload;
  const html = buildEmailHtml(appointment, contact);
  const subject = `IAR — Appointment confirmed with ${appointment.providerName}`;
  const ics = generateFullCalendarPackage(appointment);

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const sender = process.env.GMAIL_SENDER_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !sender) {
    return {
      channel: "email",
      success: true,
      demo: true,
      message: `Demo email logged for ${contact.email}`,
      detail: `${subject}\n\n${html.replace(/<[^>]+>/g, " ")}`,
    };
  }

  try {
    const { google } = await import("googleapis");
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const boundary = "iar_boundary";
    const raw = [
      `From: IAR <${sender}>`,
      `To: ${contact.name} <${contact.email}>`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
      `--${boundary}`,
      "Content-Type: text/calendar; charset=UTF-8; method=PUBLISH",
      "Content-Disposition: attachment; filename=appointment.ics",
      "",
      ics,
      `--${boundary}--`,
    ].join("\r\n");

    const encoded = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    return {
      channel: "email",
      success: true,
      demo: false,
      message: `Email sent to ${contact.email} via Gmail`,
    };
  } catch (err) {
    return {
      channel: "email",
      success: true,
      demo: true,
      fallback: true,
      message: `Email could not send — download .ics on confirmation for ${contact.email}`,
      detail: err instanceof Error ? err.message : `${subject}\n\n${html.replace(/<[^>]+>/g, " ")}`,
    };
  }
}
export async function sendBookingNotifications(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const [sms, email] = await Promise.all([sendSms(payload), sendEmail(payload)]);
  return [sms, email];
}
