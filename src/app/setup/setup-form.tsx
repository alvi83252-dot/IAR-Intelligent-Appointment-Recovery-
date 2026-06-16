"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Loader2, Mail, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface GmailSettings {
  clientId: string;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  senderEmail: string;
  redirectUri: string;
  gmailConfigured: boolean;
  readyToConnect: boolean;
}

interface IntegrationStatus {
  setupAllowed: boolean;
  twilio: { configured: boolean; source: "env" | "store" | "none" };
  gmail: { configured: boolean; source: "env" | "store" | "none" };
  googleCalendar: { configured: boolean; source: "env" | "store" | "none" };
  secretsFile: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function SetupForm() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<GmailSettings | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [senderEmail, setSenderEmail] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [twilioMessagingServiceSid, setTwilioMessagingServiceSid] = useState("");
  const [savingTwilio, setSavingTwilio] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const [googleRes, statusRes] = await Promise.all([
      fetch("/api/integrations/google/settings"),
      fetch("/api/integrations/status"),
    ]);
    const data = (await googleRes.json()) as GmailSettings;
    const integrationStatus = (await statusRes.json()) as IntegrationStatus;
    setSettings(data);
    setStatus(integrationStatus);
    if (data.senderEmail) setSenderEmail(data.senderEmail);
    setLoading(false);
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    const google = searchParams.get("google");
    const error = searchParams.get("error");
    if (google === "connected") {
      setMessage("Gmail connected. Confirmation emails will send automatically after booking.");
      void loadSettings();
    } else if (error === "missing_google_client") {
      setMessage(
        "Gmail Client ID and Secret are missing. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env.local, then restart the dev server."
      );
    } else if (error) {
      setMessage(`Google sign-in error: ${decodeURIComponent(error)}`);
    }
  }, [searchParams]);

  const connectGoogle = () => {
    const params = senderEmail.trim() ? `?senderEmail=${encodeURIComponent(senderEmail.trim())}` : "";
    window.location.href = `/api/integrations/google/auth${params}`;
  };

  const saveTwilio = async () => {
    setSavingTwilio(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          phoneNumber: twilioPhoneNumber,
          messagingServiceSid: twilioMessagingServiceSid,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save Twilio credentials.");
      setMessage(data.message ?? "Twilio connected. Confirmation SMS will send automatically after booking.");
      setTwilioAuthToken("");
      await loadSettings();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save Twilio credentials.");
    } finally {
      setSavingTwilio(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Delivery setup</h1>
        <p className="mt-2 text-muted-foreground">
          Connect Gmail for confirmation emails and Twilio for automatic SMS delivery.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/confirmation">Back to confirmation</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/test">Test delivery</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking delivery status...
        </div>
      ) : settings && status ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatusBadge ok={settings.hasClientSecret} label="Google client configured" />
            <StatusBadge ok={status.gmail.configured} label={`Gmail ${status.gmail.source}`} />
            <StatusBadge ok={status.twilio.configured} label={`Twilio ${status.twilio.source}`} />
          </CardContent>
        </Card>
      ) : null}

      {message && (
        <p className="mb-6 rounded-lg border bg-muted/50 p-3 text-sm" role="status">
          {message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-iar-teal" /> Connect Gmail
          </CardTitle>
          <CardDescription>
            Client ID and Secret are read from <code className="text-xs">.env.local</code>. In Google
            Cloud Console, add this redirect URI:{" "}
            <code className="text-xs break-all">{settings?.redirectUri}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.clientId && (
            <p className="text-xs text-muted-foreground">
              Client ID: <code className="break-all">{settings.clientId}</code>
            </p>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium">Sender Gmail</label>
            <Input
              type="email"
              placeholder="you@gmail.com - auto-detected after sign-in if left blank"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
          </div>
          <Button
            variant="premium"
            className="w-full sm:w-auto"
            onClick={connectGoogle}
            disabled={!settings?.hasClientSecret}
          >
            <Calendar className="h-4 w-4" /> Sign in with Google
          </Button>
          {!settings?.hasClientSecret && (
            <p className="text-sm text-destructive">
              Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env.local, then restart{" "}
              <code className="text-xs">npm run dev</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-iar-teal" /> Connect Twilio SMS
          </CardTitle>
          <CardDescription>
            Save dev/demo Twilio credentials locally. Use either a Twilio phone number or a Messaging
            Service SID as the sender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.twilio.configured && (
            <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">
              Twilio is configured from {status.twilio.source}. SMS confirmations will send automatically.
            </p>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium">Account SID</label>
            <Input
              placeholder="AC..."
              value={twilioAccountSid}
              onChange={(e) => setTwilioAccountSid(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Auth token</label>
            <Input
              type="password"
              placeholder="Twilio auth token"
              value={twilioAuthToken}
              onChange={(e) => setTwilioAuthToken(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Sender phone number</label>
              <Input
                type="tel"
                placeholder="+447700900000"
                value={twilioPhoneNumber}
                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Messaging Service SID</label>
              <Input
                placeholder="MG..."
                value={twilioMessagingServiceSid}
                onChange={(e) => setTwilioMessagingServiceSid(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <Button
            variant="premium"
            className="w-full sm:w-auto"
            onClick={() => void saveTwilio()}
            disabled={savingTwilio || !status?.setupAllowed}
          >
            {savingTwilio ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Save Twilio
          </Button>
          {!status?.setupAllowed && (
            <p className="text-sm text-destructive">Local integration setup is disabled in this environment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
