import type { Appointment, AppointmentStatus } from "./index";

export interface PasSlot {
  id: string;
  dateTime: string;
  providerId: string;
  providerName: string;
  practiceId: string;
  practiceName: string;
  duration: number;
  status: "available" | "booked" | "blocked";
}

export interface PasWriteLog {
  id: string;
  timestamp: string;
  operation: "search" | "book" | "reschedule" | "cancel" | "swap" | "recovery";
  agentId: "front-desk";
  summary: string;
  appointmentId?: string;
}

export interface PasLedgerSnapshot {
  ledger: string;
  practiceName: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  appointments: Appointment[];
  recentWrites: PasWriteLog[];
}
