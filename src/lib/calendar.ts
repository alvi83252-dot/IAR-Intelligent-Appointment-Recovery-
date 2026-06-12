import { addDays, addHours, addMinutes, format, subDays, subHours, subMinutes } from "date-fns";
import type { Appointment } from "@/types";

function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
}

function buildEvent(event: ICSEvent): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(event.end)}`,
    `SUMMARY:${escapeICS(event.summary)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  if (event.status) lines.push(`STATUS:${event.status}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function generateAppointmentICS(appointment: Appointment): string {
  const start = new Date(appointment.dateTime);
  const end = addMinutes(start, appointment.duration);

  const event = buildEvent({
    uid: `${appointment.id}@iar.app`,
    summary: `${appointment.specialty} — ${appointment.providerName}`,
    description: `IAR Appointment\nPatient: ${appointment.patientName}\nPriority: ${appointment.priorityBand}\nSymptoms: ${appointment.symptoms}`,
    start,
    end,
    location: appointment.location,
    status: appointment.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
  });

  return wrapCalendar([event]);
}

export function generateReminderICS(
  appointment: Appointment,
  reminderLabel: string,
  reminderTime: Date
): string {
  const event = buildEvent({
    uid: `${appointment.id}-reminder-${reminderLabel}@iar.app`,
    summary: `Reminder: ${appointment.specialty} appointment`,
    description: `${reminderLabel} reminder for your appointment with ${appointment.providerName} on ${format(new Date(appointment.dateTime), "PPpp")}`,
    start: reminderTime,
    end: addMinutes(reminderTime, 15),
    location: appointment.location,
  });
  return wrapCalendar([event]);
}

export function generateFullCalendarPackage(appointment: Appointment): string {
  const start = new Date(appointment.dateTime);
  const events: string[] = [];

  events.push(
    buildEvent({
      uid: `${appointment.id}@iar.app`,
      summary: `${appointment.specialty} — ${appointment.providerName}`,
      description: `IAR Appointment\nPriority: ${appointment.priorityBand}`,
      start,
      end: addMinutes(start, appointment.duration),
      location: appointment.location,
      status: "CONFIRMED",
    })
  );

  const reminders = [
    { label: "1 day before", time: subDays(start, 1) },
    { label: "1 hour before", time: subHours(start, 1) },
    { label: "10 minutes before", time: subMinutes(start, 10) },
  ];

  for (const r of reminders) {
    events.push(
      buildEvent({
        uid: `${appointment.id}-rem-${r.label.replace(/\s/g, "")}@iar.app`,
        summary: `Reminder: ${appointment.specialty}`,
        description: `${r.label} — Appointment with ${appointment.providerName}`,
        start: r.time,
        end: addMinutes(r.time, 15),
      })
    );
  }

  return wrapCalendar(events);
}

export function generateCancellationICS(appointment: Appointment): string {
  const start = new Date(appointment.dateTime);
  const event = buildEvent({
    uid: `${appointment.id}-cancelled@iar.app`,
    summary: `CANCELLED: ${appointment.specialty}`,
    description: `Your appointment with ${appointment.providerName} has been cancelled.`,
    start,
    end: addMinutes(start, appointment.duration),
    status: "CANCELLED",
  });
  return wrapCalendar([event]);
}

export function generateRescheduleICS(
  appointment: Appointment,
  previousDateTime: string
): string {
  const start = new Date(appointment.dateTime);
  const event = buildEvent({
    uid: `${appointment.id}-rescheduled@iar.app`,
    summary: `RESCHEDULED: ${appointment.specialty}`,
    description: `Rescheduled from ${format(new Date(previousDateTime), "PPpp")} to ${format(start, "PPpp")}`,
    start,
    end: addMinutes(start, appointment.duration),
    location: appointment.location,
    status: "CONFIRMED",
  });
  return wrapCalendar([event]);
}

function wrapCalendar(events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IAR//GP Appointment Routing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
