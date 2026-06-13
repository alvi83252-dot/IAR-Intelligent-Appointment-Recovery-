import { addDays } from "date-fns";
import { PAS_LEDGER_NAME } from "@/lib/config";
import { generateId } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types";
import type { PasLedgerSnapshot, PasSlot, PasWriteLog } from "@/types/pas";

const GP_PRACTICE = "Riverside GP Surgery";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

class SystemCIARAdapter {
  private slots: PasSlot[] = [];
  private appointments: Appointment[] = [];
  private writeLog: PasWriteLog[] = [];

  initialize(slots: PasSlot[], appointments: Appointment[]) {
    this.slots = slots.map((s) => ({ ...s }));
    this.appointments = appointments.map((a) => ({ ...a }));
    this.writeLog = [];
  }

  private log(
    operation: PasWriteLog["operation"],
    summary: string,
    appointmentId?: string
  ) {
    const entry: PasWriteLog = {
      id: generateId("pas"),
      timestamp: new Date().toISOString(),
      operation,
      agentId: "front-desk",
      summary,
      appointmentId,
    };
    this.writeLog = [entry, ...this.writeLog].slice(0, 50);
    return entry;
  }

  async searchAvailability(options?: {
    urgent?: boolean;
    providerId?: string;
  }): Promise<PasSlot[]> {
    await delay(200);
    this.log("search", `Front Desk Agent queried ${PAS_LEDGER_NAME} availability`);

    let available = this.slots.filter((s) => s.status === "available");

    if (options?.providerId) {
      available = available.filter((s) => s.providerId === options.providerId);
    }

    if (options?.urgent) {
      const cutoff = addDays(new Date(), 5).toISOString();
      available = available.filter((s) => s.dateTime < cutoff);
    }

    return available;
  }

  async bookAppointment(
    slotId: string,
    appointment: Omit<Appointment, "id" | "status">
  ): Promise<Appointment> {
    await delay(250);
    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot || slot.status !== "available") {
      throw new Error(`Slot ${slotId} unavailable in ${PAS_LEDGER_NAME}`);
    }

    const booked: Appointment = {
      ...appointment,
      id: generateId("apt"),
      status: "confirmed",
      location: appointment.location ?? `${GP_PRACTICE}, Consulting Room`,
    };

    this.slots = this.slots.map((s) =>
      s.id === slotId ? { ...s, status: "booked" as const } : s
    );
    this.appointments = [booked, ...this.appointments];

    this.log(
      "book",
      `Booked ${booked.patientName} with ${booked.providerName} via PAS ledger`,
      booked.id
    );

    return booked;
  }

  async rescheduleAppointment(
    appointmentId: string,
    newDateTime: string
  ): Promise<Appointment> {
    await delay(200);
    const apt = this.appointments.find((a) => a.id === appointmentId);
    if (!apt) throw new Error("Appointment not found in PAS ledger");

    const updated = {
      ...apt,
      dateTime: newDateTime,
      status: "rescheduled" as AppointmentStatus,
    };

    this.appointments = this.appointments.map((a) =>
      a.id === appointmentId ? updated : a
    );

    this.log(
      "reschedule",
      `Rescheduled ${apt.patientName} to ${new Date(newDateTime).toLocaleString()}`,
      appointmentId
    );

    return updated;
  }

  async recordSwap(appointmentId: string, summary: string): Promise<void> {
    await delay(150);
    this.log("swap", summary, appointmentId);
  }

  async recordRecovery(summary: string): Promise<void> {
    await delay(150);
    this.log("recovery", summary);
  }

  getAppointments(): Appointment[] {
    return [...this.appointments];
  }

  getWriteLog(): PasWriteLog[] {
    return [...this.writeLog];
  }

  getSnapshot(): PasLedgerSnapshot {
    const booked = this.slots.filter((s) => s.status === "booked").length;
    const available = this.slots.filter((s) => s.status === "available").length;

    return {
      ledger: PAS_LEDGER_NAME,
      practiceName: GP_PRACTICE,
      totalSlots: this.slots.length,
      bookedSlots: booked,
      availableSlots: available,
      appointments: this.getAppointments(),
      recentWrites: this.getWriteLog().slice(0, 10),
    };
  }

  reset(slots: PasSlot[], appointments: Appointment[]) {
    this.initialize(slots, appointments);
  }
}

export const pasAdapter = new SystemCIARAdapter();
