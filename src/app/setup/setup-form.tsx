"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [senderEmail, setSenderEmail] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    const res = await fetch("/api/integrations/google/settings");
    const data = (await res.json()) as GmailSettings;
    setSettings(data);
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gmail setup</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with Google once so IAR can send confirmation emails. SMS uses your phone&apos;s
          Messages app — no Twilio required.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/confirmation">Back to confirmation</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/test">Test email</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking Gmail status…
        </div>
      ) : settings ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatusBadge ok={settings.hasClientSecret} label="Client configured" />
            <StatusBadge ok={settings.gmailConfigured} label="Gmail connected" />
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
            <Mail className="h-5 w-5 text-iar-teal" /> Sign in with Google
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
            <label className="mb-2 block text-sm font-medium">Sender Gmail (optional)</label>
            <Input
              type="email"
              placeholder="you@gmail.com — auto-detected after sign-in if left blank"
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
    </div>
  );
}
