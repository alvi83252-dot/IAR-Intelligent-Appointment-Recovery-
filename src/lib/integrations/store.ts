import fs from "fs";
import path from "path";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
}

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderEmail: string;
  calendarId?: string;
}

export interface IntegrationsStore {
  twilio?: TwilioCredentials;
  google?: GoogleCredentials;
}

const SECRETS_DIR = path.join(process.cwd(), ".iar-secrets");
const SECRETS_FILE = path.join(SECRETS_DIR, "integrations.json");

export function isIntegrationsSetupAllowed(): boolean {
  return process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true";
}

export function readIntegrationsStore(): IntegrationsStore {
  try {
    if (!fs.existsSync(SECRETS_FILE)) return {};
    const raw = fs.readFileSync(SECRETS_FILE, "utf8");
    return JSON.parse(raw) as IntegrationsStore;
  } catch {
    return {};
  }
}

export function writeIntegrationsStore(update: Partial<IntegrationsStore>): IntegrationsStore {
  if (!isIntegrationsSetupAllowed()) {
    throw new Error("Integration setup is only available in development or demo mode.");
  }

  fs.mkdirSync(SECRETS_DIR, { recursive: true });
  const current = readIntegrationsStore();
  const next: IntegrationsStore = {
    ...current,
    ...update,
    twilio: update.twilio ? { ...current.twilio, ...update.twilio } : current.twilio,
    google: update.google ? { ...current.google, ...update.google } : current.google,
  };

  fs.writeFileSync(SECRETS_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getSecretsFilePath(): string {
  return SECRETS_FILE;
}
