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
import { GOOGLE_MEETUP_BOOKING_URL } from "@/lib/config";
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

  const deliverConfirmations = async () => {
    if (!appointment || !patientContact) return;
    setSending(true);
    try {
      const existingCalendar = useIARStore.getState().lastCalendarResult;
      const notifyRes = await fetch("/api/notifications/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: patientContact, appointment }),
      });

      let calendarData = existingCalendar;
      if (!existingCalendar) {
        const calendarRes = await fetch("/api/calendar/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment, email: patientContact.email }),
        });
        calendarData = await calendarRes.json();
      }

      const notifyData = await notifyRes.json();

      useIARStore.setState((state) => {
        const results = notifyData.results ?? null;
        const extraNotifications =
          results?.map((result: { channel: string; message: string; demo?: boolean }) => ({
            id: `notif_${result.channel}_${Date.now()}`,
            title: result.channel === "sms" ? "SMS confirmation" : "Email confirmation",
            message: result.message,
            type: "info" as const,
            read: false,
            createdAt: new Date().toISOString(),
          })) ?? [];

        return {
          lastNotificationResults: results,
          lastCalendarResult: calendarData ?? null,
          notifications: extraNotifications.length
            ? [...extraNotifications, ...state.notifications]
            : state.notifications,
        };
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!appointment || !patientContact || sentRef.current || notificationResults) return;
    sentRef.current = true;
    void deliverConfirmations();
  }, [appointment, patientContact, notificationResults]);

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

  const meetupUrl =
    calendarResult?.meetupBookingUrl ??
    calendarResult?.eventUrl ??
    calendarResult?.calendarUrl ??
    GOOGLE_MEETUP_BOOKING_URL;
  const hasNotificationFailure = notificationResults?.some((result) => !result.success) ?? false;
  const notificationHeading = sending
    ? "Sending confirmations..."
    : hasNotificationFailure
      ? "Confirmation delivery needs setup"
      : notificationResults
        ? "Confirmations sent"
        : "Confirmations";

  const nextOptions = [
    {
      id: "download",
      label: "Download calendar file",
      description: "Save the appointment to your phone or computer with reminders.",
      onSelect: handleDownloadCalendar,
    },
    {
      id: "google-meetup",
      label: "Book meetup on Google Calendar",
      description: "Open your Google Calendar appointment page to schedule or manage the meetup.",
      href: meetupUrl,
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
                  <Loader2 className="h-4 w-4 animate-spin" /> {notificationHeading}
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 text-iar-teal" /> {notificationHeading}
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
                <div className="flex-1">
                  <p>
                    {result.message}
                    {result.demo && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">in-app</span>
                    )}
                  </p>
                  {result.detail && (
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-background/80 p-2 text-xs text-muted-foreground">
                      {result.detail.slice(0, 320)}
                    </p>
                  )}
                  {result.actionUrl && (
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a href={result.actionUrl}>
                        {result.channel === "sms" ? "Open in Messages" : "Open in email app"}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {hasNotificationFailure && patientContact && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => void deliverConfirmations()}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Retry delivery
              </Button>
            )}
            {calendarResult && (
              <div className="space-y-2">
                <p className={`flex items-start gap-2 ${calendarResult.success ? undefined : "text-destructive"}`}>
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {calendarResult.message}
                    {!calendarResult.success && (
                      <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                        failed
                      </span>
                    )}
                  </span>
                </p>
                {calendarResult.detail && (
                  <p className="text-xs text-muted-foreground">{calendarResult.detail.slice(0, 240)}</p>
                )}
                <Button variant="premium" size="sm" asChild className="w-full sm:w-auto">
                  <a href={meetupUrl} target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-4 w-4" />
                    Book meetup on Google Calendar
                  </a>
                </Button>
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
