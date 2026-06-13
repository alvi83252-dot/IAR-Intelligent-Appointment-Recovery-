import { describe, expect, it, beforeEach } from "vitest";
import { pasAdapter } from "@/services/pas-adapter";
import { INITIAL_APPOINTMENTS, INITIAL_PAS_SLOTS } from "@/services/mock-data";

describe("pasAdapter", () => {
  beforeEach(() => {
    pasAdapter.reset(INITIAL_PAS_SLOTS, INITIAL_APPOINTMENTS);
  });

  it("searches available GP slots", async () => {
    const slots = await pasAdapter.searchAvailability();
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.status === "available")).toBe(true);
  });

  it("books appointment and writes to ledger log", async () => {
    const slots = await pasAdapter.searchAvailability();
    const slot = slots[0];

    const apt = await pasAdapter.bookAppointment(slot.id, {
      patientId: "p_test",
      patientName: "Test Patient",
      providerId: slot.providerId,
      providerName: slot.providerName,
      specialty: "General Practice",
      dateTime: slot.dateTime,
      duration: 15,
      priorityScore: 40,
      priorityBand: "moderate",
      symptoms: "Test",
      location: "Riverside GP Surgery",
    });

    expect(apt.id).toBeTruthy();
    expect(pasAdapter.getWriteLog().some((l) => l.operation === "book")).toBe(true);
  });

  it("returns ledger snapshot", () => {
    const snapshot = pasAdapter.getSnapshot();
    expect(snapshot.ledger).toBe("System C IAR");
    expect(snapshot.practiceName).toContain("GP");
  });
});
