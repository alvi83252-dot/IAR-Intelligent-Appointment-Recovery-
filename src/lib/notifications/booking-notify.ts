import type { NotificationPayload, NotificationResult } from "@/lib/notifications/built-in-notify";
import {
  buildEmailHtml,
  buildEmailPlainText,
  buildSmsBody,
  sendBuiltInEmail,
  sendBuiltInSms,
} from "@/lib/notifications/built-in-notify";
import { generateFullCalendarPackage } from "@/lib/calendar";
import { getGmailSenderEmail, getGoogleCredentials } from "@/lib/integrations/credentials";

export type { NotificationPayload, NotificationResult, PatientContact } from "@/lib/notifications/built-in-notify";
export {
  buildSmsBody,
  buildEmailHtml,
  buildSmsActionUrl,
  buildEmailActionUrl,
} from "@/lib/notifications/built-in-notify";

/** SMS always uses in-app confirmation (no Twilio). */
export async function sendSms(payload: NotificationPayload): Promise<NotificationResult> {
  const builtIn = sendBuiltInSms(payload);
  return {
    ...builtIn,
    message: `SMS confirmation ready for ${payload.contact.phone}`,
    detail: `${builtIn.detail}\n\nTap "Open in Messages" to send from your phone.`,
  };
}

/** Email via Gmail API when connected; otherwise in-app + mailto link. */
export async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  const builtIn = sendBuiltInEmail(payload);
  const { contact, appointment } = payload;

  const google = getGoogleCredentials();
  const sender = getGmailSenderEmail();

  if (!google || !sender) {
    return {
      ...builtIn,
      message: `Email confirmation ready for ${contact.email}`,
      detail: builtIn.detail,
    };
  }

  const html = buildEmailHtml(appointment, contact);
  const subject = `IAR — Appointment confirmed with ${appointment.providerName}`;
  const ics = generateFullCalendarPackage(appointment);
  const { clientId, clientSecret, refreshToken } = google;

  try {
    const { google: googleapis } = await import("googleapis");
    const oauth2 = new googleapis.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });

    const gmail = googleapis.gmail({ version: "v1", auth: oauth2 });
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
      detail: buildEmailPlainText(appointment, contact),
    };
  } catch (err) {
    return {
      ...builtIn,
      message: `Email confirmation ready for ${contact.email}`,
      detail: err instanceof Error ? err.message : buildEmailPlainText(appointment, contact),
    };
  }
}

export async function sendBookingNotifications(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const [sms, email] = await Promise.all([sendSms(payload), sendEmail(payload)]);
  return [sms, email];
}
