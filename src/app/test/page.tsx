"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Mail, MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIARStore } from "@/hooks/use-iar-store";
import { speakText, transcribeAudio } from "@/lib/voice/client";
import { GOOGLE_MEETUP_BOOKING_URL } from "@/lib/config";
import { DEMO_PATIENT } from "@/services/mock-data";

export default function IntegrationTestPage() {
  const [ttsText, setTtsText] = useState(
    "Hello from IAR. This is a test of ElevenLabs text to speech for accessibility."
  );
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [sttStatus, setSttStatus] = useState<string | null>(null);
  const [sttResult, setSttResult] = useState("");
  const [recording, setRecording] = useState(false);
  const [testEmail, setTestEmail] = useState(DEMO_PATIENT.email);
  const [testPhone, setTestPhone] = useState(DEMO_PATIENT.phone);
  const [testName, setTestName] = useState(DEMO_PATIENT.name);
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<string | null>(null);

  const sampleAppointment = useIARStore((s) => s.appointments[0]);

  const testTts = async () => {
    setTtsStatus(null);
    try {
      await speakText(ttsText);
      setTtsStatus("Speech played successfully.");
    } catch (err) {
      setTtsStatus(err instanceof Error ? err.message : "TTS failed");
    }
  };

  const testStt = async () => {
    setSttStatus("Requesting microphone…");
    setSttResult("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setSttStatus("Transcribing…");
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const result = await transcribeAudio(blob);
          setSttResult(result.text || "(no speech detected)");
          setSttStatus(
            result.fallback
              ? "Transcription complete (browser fallback)."
              : "Transcription complete."
          );
        } catch (err) {
          setSttStatus(err instanceof Error ? err.message : "STT failed");
        }
      };
      recorder.start();
      setRecording(true);
      setSttStatus("Recording… speak now, then click stop.");
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 5000);
    } catch {
      setSttStatus("Microphone permission denied.");
    }
  };

  const testNotifications = async () => {
    if (!sampleAppointment) return;
    setNotifyStatus("Sending…");
    const response = await fetch("/api/notifications/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact: { name: testName, email: testEmail, phone: testPhone },
        appointment: sampleAppointment,
      }),
    });
    const data = await response.json();
    setNotifyStatus(JSON.stringify(data.results, null, 2));
  };

  const testCalendar = async () => {
    if (!sampleAppointment) return;
    setCalendarStatus("Pushing…");
    const response = await fetch("/api/calendar/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment: sampleAppointment, email: testEmail }),
    });
    const data = await response.json();
    setCalendarStatus(JSON.stringify(data, null, 2));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integration test hub</h1>
        <p className="mt-2 text-muted-foreground">
          Test ElevenLabs, Google Calendar, SMS, and Gmail before going through the full booking flow.
        </p>
        <Button variant="premium" className="mt-4" asChild>
          <Link href="/setup">Configure Twilio &amp; Google</Link>
        </Button>
        <Button variant="outline" className="mt-4 ml-2" asChild>
          <Link href="/">Back to chat</Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-iar-teal" /> ElevenLabs voice
            </CardTitle>
            <CardDescription>
              Requires <code className="text-xs">ELEVENLABS_API_KEY</code> in{" "}
              <code className="text-xs">.env.local</code>. Restart dev server after changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Text-to-speech</label>
              <Textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={3} />
              <Button className="mt-2" onClick={() => void testTts()}>
                Play speech
              </Button>
              {ttsStatus && <p className="mt-2 text-sm text-muted-foreground">{ttsStatus}</p>}
            </div>
            <div className="border-t pt-4">
              <label className="mb-2 block text-sm font-medium">Speech-to-text (5 sec)</label>
              <Button variant="outline" onClick={() => void testStt()} disabled={recording}>
                {recording ? "Recording…" : "Record & transcribe"}
              </Button>
              {sttStatus && <p className="mt-2 text-sm text-muted-foreground">{sttStatus}</p>}
              {sttResult && (
                <p className="mt-2 rounded-lg bg-muted p-3 text-sm">
                  <strong>Heard:</strong> {sttResult}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-iar-teal" /> SMS & Gmail
            </CardTitle>
            <CardDescription>
              Uses built-in SMS and email confirmations by default (shown on this page and your dashboard).
              Set <code className="text-xs">NOTIFICATIONS_MODE=live</code> in <code className="text-xs">.env.local</code>{" "}
              to send via Twilio/Gmail instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" value={testName} onChange={(e) => setTestName(e.target.value)} />
            <Input type="email" placeholder="Email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <Input type="tel" placeholder="Phone (+44…)" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            <Button onClick={() => void testNotifications()}>
              <Mail className="h-4 w-4" /> Send test SMS + email
            </Button>
            {notifyStatus && (
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{notifyStatus}</pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-iar-teal" /> Calendar
            </CardTitle>
            <CardDescription>
              Creates a Google Calendar event when OAuth is connected. Meetups use your Google
              Calendar booking page (
              <a
                href={GOOGLE_MEETUP_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-iar-teal underline-offset-2 hover:underline"
              >
                calendar.app.google/PAm4y6BTimvayDrK9
              </a>
              ). A downloadable .ics file is also available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" asChild>
              <a href={GOOGLE_MEETUP_BOOKING_URL} target="_blank" rel="noopener noreferrer">
                Open meetup booking page
              </a>
            </Button>
            <Button onClick={() => void testCalendar()}>Push sample appointment to Google Calendar</Button>
            {calendarStatus && (
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{calendarStatus}</pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
