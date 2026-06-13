"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, CheckCircle, Download, Loader2, Mail, MapPin, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoiceOptionsPanel } from "@/components/access/voice-options-panel";
import { PriorityBadge } from "@/components/priority/priority-badge";
import { useIARStore } from "@/hooks/use-iar-store";
import { CALENDLY_BOOKING_URL } from "@/lib/config";
import { downloadICS, generateFullCalendarPackage } from "@/lib/calendar";
import { formatDate, formatTime } from "@/lib/utils";

export default function BookingConfirmationPage() {
  const lastBooked = useIARStore((s) => s.lastBookedAppointment);
  const appointments = useIARStore((s) => s.appointments);
  const patientContact = useIARStore((s) => s.patientContact);
  const notificationResults = useIARStore((s) => s.lastNotificationResults);
  const calendarResult = useIARStore((s) => s.lastCalendarResult);

  const [sending, setSending] = useState(false);
  const sentRef = useRef(false);

  const appointment = lastBooked ?? appointments[0];

  useEffect(() => {
    if (!appointment || !patientContact || sentRef.current) return;
    sentRef.current = true;

    const deliver = async () => {
      setSending(true);
      try {
        const [notifyRes, calendarRes] = await Promise.all([
          fetch("/api/notifications/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact: patientContact, appointment }),
          }),
          fetch("/api/calendar/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointment, email: patientContact.email }),
          }),
        ]);

        const notifyData = await notifyRes.json();
        const calendarData = await calendarRes.json();

        useIARStore.setState({
          lastNotificationResults: notifyData.results ?? null,
          lastCalendarResult: calendarData ?? null,
        });
      } finally {
        setSending(false);
      }
    };

    void deliver();
  }, [appointment, patientContact]);

  if (!appointment) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">No appointment to confirm.</p>
        <Button className="mt-4" asChild>
          <Link href="/start">Get Started</Link>
        </Button>
      </div>
    );
  }

  const handleDownloadCalendar = () => {
    const ics = generateFullCalendarPackage(appointment);
    downloadICS(ics, `iar-appointment-${appointment.id}.ics`);
  };

  const calendlyUrl = CALENDLY_BOOKING_URL;

  const nextOptions = [
    {
      id: "download",
      label: "Download calendar file",
      description: "Save the appointment to your phone or computer with reminders.",
      onSelect: handleDownloadCalendar,
    },
    {
      id: "calendly",
      label: "Schedule on Calendly",
      description: "Add or manage this appointment via your Calendly page.",
      href: calendlyUrl,
    },
    {
      id: "timeline",
      label: "View agent timeline",
      description: "See how your Personal, Research, and Front Desk agents coordinated.",
      href: "/timeline",
    },
    {
      id: "dashboard",
      label: "Return to patient dashboard",
      description: "Go back to your home screen and notifications.",
      href: "/dashboard",
    },
    {
      id: "request",
      label: "Book another appointment",
      description: "Start a new appointment request with text or voice.",
      href: "/start",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
        >
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </motion.div>
        <h1 className="text-3xl font-bold">Appointment Confirmed</h1>
        <p className="mt-2 text-muted-foreground">
          Your agents have coordinated and secured your slot.
        </p>
      </motion.div>

      {(patientContact || sending || notificationResults) && (
        <Card className="mt-6 border-iar-teal/20 bg-iar-teal/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending confirmations…
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 text-iar-teal" /> Confirmations sent
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {patientContact && (
              <p className="text-muted-foreground">
                To <strong>{patientContact.phone}</strong> (SMS) and{" "}
                <strong>{patientContact.email}</strong> (email)
              </p>
            )}
            {notificationResults?.map((result) => (
              <div key={result.channel} className="flex items-start gap-2">
                {result.channel === "sms" ? (
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                  <p>
                    {result.message}
                    {(result.demo || result.fallback) && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                        {result.fallback ? "fallback" : "demo"}
                      </span>
                    )}
                  </p>
                  {result.demo && result.detail && (
                    <p className="mt-1 text-xs text-muted-foreground">{result.detail.slice(0, 160)}…</p>
                  )}
                </div>
              </div>
            ))}
            {calendarResult && (
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {calendarResult.provider === "google_calendar"
                      ? calendarResult.message
                      : "Google Calendar is not connected — use Calendly instead."}
                    {(calendarResult.demo || calendarResult.fallback) &&
                      calendarResult.provider === "google_calendar" && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                          {calendarResult.fallback ? "fallback" : "demo"}
                        </span>
                      )}
                  </span>
                </p>
                {calendarResult.provider !== "google_calendar" &&
                  (calendarResult.calendlyUrl ?? CALENDLY_BOOKING_URL) && (
                    <Button variant="premium" size="sm" asChild className="w-full sm:w-auto">
                      <a
                        href={calendarResult.calendlyUrl ?? CALENDLY_BOOKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Calendar className="h-4 w-4" />
                        Open Calendly booking
                      </a>
                    </Button>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{appointment.specialty}</CardTitle>
              <PriorityBadge band={appointment.priorityBand} score={appointment.priorityScore} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.providerName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatDate(appointment.dateTime)} at {formatTime(appointment.dateTime)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.location}</span>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Symptoms noted</p>
              <p className="mt-1 text-sm">{appointment.symptoms}</p>
            </div>

            <Button variant="premium" className="w-full sm:hidden" onClick={handleDownloadCalendar}>
              <Download className="h-4 w-4" /> Download Calendar (.ics)
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <VoiceOptionsPanel
        title="What would you like to do next?"
        intro={`Your appointment with ${appointment.providerName} on ${formatDate(appointment.dateTime)} is confirmed. Here are your available options.`}
        options={nextOptions}
      />
    </div>
  );
}
