"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Loader2, Mail, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface IntegrationStatus {
  setupAllowed: boolean;
  twilio: { configured: boolean; source: string };
  gmail: { configured: boolean; source: string };
  googleCalendar: { configured: boolean; source: string };
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
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleSender, setGoogleSender] = useState("");

  const refreshStatus = async () => {
    setLoading(true);
    const res = await fetch("/api/integrations/status");
    const data = (await res.json()) as IntegrationStatus;
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    void refreshStatus();
    void fetch("/api/integrations/google/settings")
      .then((r) => r.json())
      .then((data: { clientId?: string; senderEmail?: string; readyToConnect?: boolean }) => {
        if (data.clientId) setGoogleClientId(data.clientId);
        if (data.senderEmail) setGoogleSender(data.senderEmail);
        if (data.readyToConnect) {
          setMessage(
            "Gmail Client ID & Secret are loaded from .env.local. Click Connect Google account to enable automatic email delivery."
          );
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const google = searchParams.get("google");
    const error = searchParams.get("error");
    if (google === "connected") {
      setMessage("Google account connected. Gmail and Calendar are ready.");
      void refreshStatus();
    } else if (error) {
      setMessage(`Setup error: ${decodeURIComponent(error)}`);
    }
  }, [searchParams]);

  const saveTwilio = async () => {
    setMessage(null);
    const res = await fetch("/api/integrations/twilio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountSid: twilioSid,
        authToken: twilioToken,
        phoneNumber: twilioPhone,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    if (res.ok) void refreshStatus();
  };

  const saveGoogleSettings = async () => {
    setMessage(null);
    const res = await fetch("/api/integrations/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        senderEmail: googleSender,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    if (res.ok) void refreshStatus();
  };

  const connectGoogle = () => {
    const params = googleSender.trim()
      ? `?senderEmail=${encodeURIComponent(googleSender.trim())}`
      : "";
    window.location.href = `/api/integrations/google/auth${params}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integration setup</h1>
        <p className="mt-2 text-muted-foreground">
          Configure Twilio SMS and Google (Gmail + Calendar) so confirmations send for real after booking.
          Credentials are saved locally in <code className="text-xs">.iar-secrets/</code> (gitignored).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/test">Test integrations</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/confirmation">Back to confirmation</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking status…
        </div>
      ) : status ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Current status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatusBadge ok={status.twilio.configured} label={`Twilio (${status.twilio.source})`} />
            <StatusBadge ok={status.gmail.configured} label={`Gmail (${status.gmail.source})`} />
            <StatusBadge
              ok={status.googleCalendar.configured}
              label={`Google Calendar (${status.googleCalendar.source})`}
            />
          </CardContent>
        </Card>
      ) : null}

      {message && (
        <p className="mb-6 rounded-lg border bg-muted/50 p-3 text-sm" role="status">
          {message}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-iar-teal" /> Twilio SMS
            </CardTitle>
            <CardDescription>
              Get credentials from{" "}
              <a
                href="https://console.twilio.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-iar-teal underline-offset-2 hover:underline"
              >
                console.twilio.com
              </a>
              . Use an E.164 phone number (e.g. +447700900123).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Account SID" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} />
            <Input
              placeholder="Auth Token"
              type="password"
              value={twilioToken}
              onChange={(e) => setTwilioToken(e.target.value)}
            />
            <Input
              placeholder="Twilio phone number (+1… or +44…)"
              value={twilioPhone}
              onChange={(e) => setTwilioPhone(e.target.value)}
            />
            <Button onClick={() => void saveTwilio()}>Save Twilio credentials</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-iar-teal" /> Google Gmail + Calendar
            </CardTitle>
            <CardDescription>
              Client ID and Secret are loaded from <code className="text-xs">.env.local</code>. Click{" "}
              <strong>Connect Google account</strong> once — that creates the refresh token needed to send
              real emails. Redirect URI in Google Cloud:{" "}
              <code className="text-xs">http://localhost:3000/api/integrations/google/callback</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="OAuth Client ID"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
            />
            <Input
              placeholder="OAuth Client Secret"
              type="password"
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
            />
            <Input
              placeholder="Sender Gmail address"
              type="email"
              value={googleSender}
              onChange={(e) => setGoogleSender(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void saveGoogleSettings()}>
                Save Google settings
              </Button>
              <Button variant="premium" onClick={connectGoogle}>
                <Calendar className="h-4 w-4" /> Connect Google account (required for real email)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
