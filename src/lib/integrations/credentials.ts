import {
  getSecretsFilePath,
  readIntegrationsStore,
  type GoogleCredentials,
  type TwilioCredentials,
} from "@/lib/integrations/store";

export interface IntegrationStatus {
  twilio: { configured: boolean; source: "env" | "store" | "none" };
  gmail: { configured: boolean; source: "env" | "store" | "none" };
  googleCalendar: { configured: boolean; source: "env" | "store" | "none" };
  secretsFile: string;
}

function fromEnvTwilio(): TwilioCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!accountSid || !authToken) return null;
  if (!phoneNumber && !messagingServiceSid) return null;
  return { accountSid, authToken, phoneNumber, messagingServiceSid };
}

function fromEnvGoogle(): GoogleCredentials | null {
  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ??
    process.env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken =
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim() ?? process.env.GMAIL_REFRESH_TOKEN?.trim();
  const senderEmail = process.env.GMAIL_SENDER_EMAIL?.trim();

  if (!clientId || !clientSecret || !refreshToken) return null;

  return {
    clientId,
    clientSecret,
    refreshToken,
    senderEmail: senderEmail ?? "",
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() ?? "primary",
  };
}

export function getTwilioCredentials(): (TwilioCredentials & { source: "env" | "store" }) | null {
  const env = fromEnvTwilio();
  if (env) return { ...env, source: "env" };

  const store = readIntegrationsStore().twilio;
  if (store?.accountSid && store.authToken && (store.phoneNumber || store.messagingServiceSid)) {
    return { ...store, source: "store" };
  }

  return null;
}

export function getTwilioAuthOnly(): { accountSid: string; authToken: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (sid && token) return { accountSid: sid, authToken: token };

  const store = readIntegrationsStore().twilio;
  if (store?.accountSid && store.authToken) {
    return { accountSid: store.accountSid, authToken: store.authToken };
  }

  return null;
}

export function getGoogleCredentials(): (GoogleCredentials & { source: "env" | "store" }) | null {
  const env = fromEnvGoogle();
  if (env?.refreshToken) return { ...env, source: "env" };

  const store = readIntegrationsStore().google;
  if (store?.clientId && store.clientSecret && store.refreshToken) {
    return {
      clientId: store.clientId,
      clientSecret: store.clientSecret,
      refreshToken: store.refreshToken,
      senderEmail: store.senderEmail ?? "",
      calendarId: store.calendarId ?? "primary",
      source: "store",
    };
  }

  return null;
}

export function getGmailSenderEmail(): string | null {
  const fromEnv = process.env.GMAIL_SENDER_EMAIL?.trim();
  if (fromEnv) return fromEnv;

  const store = readIntegrationsStore().google?.senderEmail?.trim();
  return store || null;
}

export function getIntegrationStatus(): IntegrationStatus {
  const envTwilio = fromEnvTwilio();
  const envGoogle = fromEnvGoogle();
  const store = readIntegrationsStore();

  const storeTwilio =
    store.twilio?.accountSid &&
    store.twilio.authToken &&
    (store.twilio.phoneNumber || store.twilio.messagingServiceSid);
  const storeGoogle =
    store.google?.clientId && store.google.clientSecret && store.google.refreshToken;
  const storeGmail = storeGoogle && store.google?.senderEmail;

  const twilioConfigured = !!envTwilio || !!storeTwilio;
  const googleOAuthConfigured = !!(envGoogle?.refreshToken || storeGoogle);
  const gmailConfigured =
    !!(envGoogle?.refreshToken && envGoogle.senderEmail) || !!storeGmail;

  return {
    twilio: {
      configured: twilioConfigured,
      source: envTwilio ? "env" : storeTwilio ? "store" : "none",
    },
    gmail: {
      configured: gmailConfigured,
      source:
        envGoogle?.refreshToken && envGoogle.senderEmail
          ? "env"
          : storeGmail
            ? "store"
            : "none",
    },
    googleCalendar: {
      configured: googleOAuthConfigured,
      source: envGoogle?.refreshToken ? "env" : storeGoogle ? "store" : "none",
    },
    secretsFile: getSecretsFilePath(),
  };
}

export function getGoogleOAuthClientConfig(): { clientId: string; clientSecret: string } | null {
  const envId = process.env.GMAIL_CLIENT_ID?.trim() ?? process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const envSecret =
    process.env.GMAIL_CLIENT_SECRET?.trim() ?? process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  const store = readIntegrationsStore().google;
  if (store?.clientId && store.clientSecret) {
    return { clientId: store.clientId, clientSecret: store.clientSecret };
  }

  return null;
}

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
];
