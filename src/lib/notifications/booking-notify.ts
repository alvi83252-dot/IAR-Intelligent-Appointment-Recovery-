import { useLiveNotifications } from "@/lib/config";
import type { NotificationPayload, NotificationResult } from "@/lib/notifications/built-in-notify";
import {
  buildEmailHtml,
  buildEmailPlainText,
  buildSmsBody,
  sendBuiltInEmail,
  sendBuiltInSms,
} from "@/lib/notifications/built-in-notify";
import { generateFullCalendarPackage } from "@/lib/calendar";
import { externalFetch } from "@/lib/external-fetch";
import { getGmailSenderEmail, getGoogleCredentials, getTwilioCredentials } from "@/lib/integrations/credentials";

export type { NotificationPayload, NotificationResult, PatientContact } from "@/lib/notifications/built-in-notify";
export {
  buildSmsBody,
  buildEmailHtml,
  buildSmsActionUrl,
  buildEmailActionUrl,
} from "@/lib/notifications/built-in-notify";

function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s()-]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("0") && compact.length === 11) return `+44${compact.slice(1)}`;
  return compact;
}

export async function sendSms(payload: NotificationPayload): Promise<NotificationResult> {
  const builtIn = sendBuiltInSms(payload);

  if (!useLiveNotifications()) {
    return builtIn;
  }

  const twilio = getTwilioCredentials();
  if (!twilio) {
    return {
      ...builtIn,
      message: `SMS confirmation ready for ${normalizePhone(payload.contact.phone)}`,
      detail: `${builtIn.detail}\n\nTap "Open in Messages" to send from your phone. Twilio is optional.`,
    };
  }

  const { contact, appointment } = payload;
  const smsBody = buildSmsBody(appointment, contact);
  const to = normalizePhone(contact.phone);
  const { accountSid: sid, authToken: token, phoneNumber: from, messagingServiceSid } = twilio;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, Body: smsBody });
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (from) {
    params.set("From", from);
  }

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
        ...builtIn,
        message: `SMS confirmation ready for ${to}`,
        detail: detail || builtIn.detail,
      };
    }

    return {
      channel: "sms",
      success: true,
      demo: false,
      message: `SMS sent to ${to}`,
      detail: smsBody,
    };
  } catch (err) {
    return {
      ...builtIn,
      message: `SMS confirmation ready for ${to}`,
      detail: err instanceof Error ? err.message : builtIn.detail,
    };
  }
}

export async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  const builtIn = sendBuiltInEmail(payload);
  const { contact, appointment } = payload;

  if (!useLiveNotifications()) {
    return builtIn;
  }

  const google = getGoogleCredentials();
  const sender = getGmailSenderEmail();

  if (!google || !sender) {
    return {
      ...builtIn,
      message: `Email confirmation ready for ${contact.email}`,
      detail: `${builtIn.detail}\n\nGmail Client ID/Secret are saved, but you still need to sign in once at /setup → Connect Google account for automatic inbox delivery. Or tap "Open in email app".`,
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
      message: `Email sent to ${contact.email}`,
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
