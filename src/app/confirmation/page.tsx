"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, CheckCircle, Download, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/priority/priority-badge";
import { useIARStore } from "@/hooks/use-iar-store";
import { downloadICS, generateFullCalendarPackage } from "@/lib/calendar";
import { formatDate, formatTime } from "@/lib/utils";

export default function BookingConfirmationPage() {
  const lastBooked = useIARStore((s) => s.lastBookedAppointment);
  const appointments = useIARStore((s) => s.appointments);

  const appointment = lastBooked ?? appointments[0];

  if (!appointment) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">No appointment to confirm.</p>
        <Button className="mt-4" asChild>
          <Link href="/request">Request Appointment</Link>
        </Button>
      </div>
    );
  }

  const handleDownloadCalendar = () => {
    const ics = generateFullCalendarPackage(appointment);
    downloadICS(ics, `iar-appointment-${appointment.id}.ics`);
  };

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

            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">Calendar Package Includes:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Appointment event</li>
                <li>• Reminder — 1 day before</li>
                <li>• Reminder — 1 hour before</li>
                <li>• Reminder — 10 minutes before</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="premium" className="flex-1" onClick={handleDownloadCalendar}>
                <Download className="h-4 w-4" /> Download Calendar (.ics)
              </Button>
              <Button variant="outline" asChild>
                <Link href="/timeline">View Timeline</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
