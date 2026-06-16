import type { NotificationPayload, NotificationResult } from "@/lib/notifications/built-in-notify";
import {
  buildEmailHtml,
  buildEmailPlainText,
  buildSmsBody,
  normalizePhone,
  sendBuiltInEmail,
  sendBuiltInSms,
} from "@/lib/notifications/built-in-notify";
import { generateFullCalendarPackage } from "@/lib/calendar";
import {
  getGmailSenderEmail,
  getGoogleCredentials,
  getTwilioCredentials,
} from "@/lib/integrations/credentials";

export type { NotificationPayload, NotificationResult, PatientContact } from "@/lib/notifications/built-in-notify";
export {
  buildSmsBody,
  buildEmailHtml,
  buildSmsActionUrl,
  buildEmailActionUrl,
} from "@/lib/notifications/built-in-notify";

/** SMS via Twilio when connected; otherwise in-app + sms: link. */
export async function sendSms(payload: NotificationPayload): Promise<NotificationResult> {
  const builtIn = sendBuiltInSms(payload);
  const twilio = getTwilioCredentials();

  if (!twilio) {
    return {
      ...builtIn,
      success: false,
      message: `SMS provider not configured for ${payload.contact.phone}`,
      detail: `${builtIn.detail}\n\nTap "Open in Messages" to send from your phone, or configure Twilio for automatic SMS delivery.`,
    };
  }

  const to = normalizePhone(payload.contact.phone);
  const body = buildSmsBody(payload.appointment, payload.contact);
  const params = new URLSearchParams({
    To: to,
    Body: body,
  });

  if (twilio.messagingServiceSid) {
    params.set("MessagingServiceSid", twilio.messagingServiceSid);
  } else if (twilio.phoneNumber) {
    params.set("From", normalizePhone(twilio.phoneNumber));
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
        twilio.accountSid
      )}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );

    const data = (await response.json().catch(() => null)) as
      | { sid?: string; message?: string }
      | null;

    if (!response.ok) {
      throw new Error(data?.message ?? `Twilio returned HTTP ${response.status}`);
    }

    return {
      channel: "sms",
      success: true,
      demo: false,
      message: `SMS sent to ${to}`,
      detail: data?.sid ? `Twilio message ${data.sid}` : body,
    };
  } catch (err) {
    return {
      ...builtIn,
      success: false,
      message: `SMS failed for ${to}`,
      detail: err instanceof Error ? err.message : "Twilio SMS failed",
    };
  }
}

function emailFallback(
  payload: NotificationPayload,
  message: string,
  detail?: string
): NotificationResult {
  const builtIn = sendBuiltInEmail(payload);
  return {
    ...builtIn,
    success: false,
    message,
    detail: detail ?? builtIn.detail,
  };
}

/** Email via Gmail API when connected; otherwise in-app + mailto link. */
export async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  const { contact, appointment } = payload;

  const google = getGoogleCredentials();
  const sender = getGmailSenderEmail();

  if (!google || !sender) {
    return emailFallback(
      payload,
      `Gmail not configured for ${contact.email}`,
      "Connect Gmail to send confirmation emails automatically, or use the mail app link."
    );
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
    return emailFallback(
      payload,
      `Email failed for ${contact.email}`,
      err instanceof Error ? err.message : buildEmailPlainText(appointment, contact)
    );
  }
}

export async function sendBookingNotifications(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const [sms, email] = await Promise.all([sendSms(payload), sendEmail(payload)]);
  return [sms, email];
}
