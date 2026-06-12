import { describe, expect, it } from "vitest";
import {
  generateAppointmentICS,
  generateFullCalendarPackage,
  generateCancellationICS,
} from "../calendar";
import type { Appointment } from "@/types";

const mockAppointment: Appointment = {
  id: "apt_test",
  patientId: "p1",
  patientName: "Test Patient",
  providerId: "prov1",
  providerName: "Dr. Test",
  specialty: "GP",
  dateTime: "2026-06-15T10:00:00.000Z",
  duration: 30,
  status: "confirmed",
  priorityScore: 50,
  priorityBand: "moderate",
  symptoms: "Test symptoms",
  location: "Test Clinic",
};

describe("calendar ICS generation", () => {
  it("generates valid VCALENDAR for appointment", () => {
    const ics = generateAppointmentICS(mockAppointment);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("Dr. Test");
  });

  it("includes reminders in full package", () => {
    const ics = generateFullCalendarPackage(mockAppointment);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(4);
  });

  it("marks cancellation events correctly", () => {
    const ics = generateCancellationICS({ ...mockAppointment, status: "cancelled" });
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("CANCELLED:");
  });
});
