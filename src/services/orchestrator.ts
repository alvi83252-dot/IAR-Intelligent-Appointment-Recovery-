import { addDays } from "date-fns";
import { a2aBus } from "@/agents/a2a-bus";
import { assessPriority } from "@/lib/priority";
import { PAS_LEDGER_NAME } from "@/lib/config";
import { generateId } from "@/lib/utils";
import { pasAdapter } from "@/services/pas-adapter";
import type {
  Appointment,
  AppointmentRequest,
  DisruptionEvent,
  PriorityAssessment,
  SwapProposal,
  TimelineEvent,
} from "@/types";
import { DEMO_PATIENT } from "./mock-data";

export async function processAppointmentRequest(
  request: AppointmentRequest,
  onTimeline: (event: TimelineEvent) => void,
  onAssessment: (assessment: PriorityAssessment) => void
): Promise<Appointment> {
  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "request",
    title: "Appointment Requested",
    description: `Request submitted: ${request.symptoms}`,
    agentId: "personal",
  });

  await a2aBus.send("personal", "research", "appointment.request", {
    symptoms: request.symptoms,
    availability: request.availability,
  });

  const assessment = assessPriority(request.symptoms, 0, request.urgencyNotes);
  onAssessment(assessment);

  await a2aBus.send("research", "front-desk", "priority.assess", {
    score: assessment.score,
    band: assessment.band,
    rationale: assessment.rationale,
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "assessment",
    title: "Priority Assessed",
    description: `Score: ${assessment.score}/100 — ${assessment.band}`,
    agentId: "research",
  });

  const isUrgent = assessment.band === "urgent" || assessment.band === "critical";
  const slots = await pasAdapter.searchAvailability({ urgent: isUrgent });
  const slot = request.preferredSlotId
    ? slots.find((candidate) => candidate.id === request.preferredSlotId)
    : slots[0];

  if (!slot) {
    throw new Error(`No availability in ${PAS_LEDGER_NAME}`);
  }

  await a2aBus.send("front-desk", "personal", "appointment.confirm", {
    slotId: slot.id,
    dateTime: slot.dateTime,
    provider: slot.providerName,
    ledger: PAS_LEDGER_NAME,
  });

  const appointment = await pasAdapter.bookAppointment(slot.id, {
    patientId: DEMO_PATIENT.id,
    patientName: DEMO_PATIENT.name,
    providerId: slot.providerId,
    providerName: slot.providerName,
    specialty: "General Practice",
    dateTime: slot.dateTime,
    duration: slot.duration,
    priorityScore: assessment.score,
    priorityBand: assessment.band,
    symptoms: request.symptoms,
    location: `${slot.practiceName}, Consulting Room`,
  });

  await a2aBus.send("front-desk", "personal", "calendar.sync", {
    appointmentId: appointment.id,
    dateTime: appointment.dateTime,
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "booking",
    title: "PAS Ledger Updated",
    description: `Front Desk Agent wrote booking to ${PAS_LEDGER_NAME} — ${slot.providerName}`,
    agentId: "front-desk",
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "calendar",
    title: "Calendar Events Generated",
    description: "Appointment + reminders (1 day, 1 hour, 10 min before)",
    agentId: "personal",
  });

  return appointment;
}

export async function processSwapAcceptance(
  proposal: SwapProposal,
  onTimeline: (event: TimelineEvent) => void
): Promise<void> {
  await a2aBus.send("personal", "front-desk", "swap.respond", {
    proposalId: proposal.id,
    accepted: true,
  });

  await pasAdapter.recordSwap(
    proposal.candidateAppointmentId,
    `Swap accepted: ${proposal.urgentPatientName} ↔ ${proposal.candidatePatientName}`
  );

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "swap",
    title: "Swap Accepted",
    description: `${proposal.urgentPatientName} receives earlier GP care via PAS ledger update.`,
    agentId: "personal",
  });
}

export async function processSwapDecline(
  proposal: SwapProposal,
  onTimeline: (event: TimelineEvent) => void
): Promise<void> {
  await a2aBus.send("personal", "front-desk", "swap.respond", {
    proposalId: proposal.id,
    accepted: false,
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "swap",
    title: "Swap Declined",
    description: "Candidate patient declined swap proposal. Exploring alternatives.",
    agentId: "personal",
  });
}

export async function runDisruptionCascade(
  disruption: DisruptionEvent,
  onTimeline: (event: TimelineEvent) => void,
  onProgress: (metrics: DisruptionEvent["metrics"]) => void
): Promise<DisruptionEvent> {
  await a2aBus.send("front-desk", "broadcast", "disruption.notify", {
    disruptionId: disruption.id,
    provider: disruption.providerName,
    affectedCount: disruption.affectedAppointmentIds.length,
    ledger: PAS_LEDGER_NAME,
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "disruption",
    title: "Disruption Cascade Initiated",
    description: `${disruption.providerName} unavailable — ${disruption.affectedAppointmentIds.length} GP appointments impacted in PAS ledger.`,
    agentId: "front-desk",
  });

  const steps = [
    { delay: 800, msg: "Reprioritizing affected GP appointments", agent: "research" as const },
    { delay: 1000, msg: `Querying partner surgeries in ${PAS_LEDGER_NAME}`, agent: "front-desk" as const },
    { delay: 800, msg: "Notifying patients of schedule changes", agent: "personal" as const },
    { delay: 1000, msg: "Rebooking high-priority patients via PAS ledger", agent: "front-desk" as const },
  ];

  let metrics = { ...disruption.metrics };

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, step.delay));
    await a2aBus.send(step.agent, "broadcast", "overflow.request", { step: step.msg });
    await pasAdapter.recordRecovery(step.msg);
    onTimeline({
      id: generateId("tl"),
      timestamp: new Date().toISOString(),
      type: "recovery",
      title: "Recovery Step",
      description: step.msg,
      agentId: step.agent,
    });
    metrics = {
      ...metrics,
      patientsRebooked: Math.min(metrics.patientsRebooked + 2, disruption.affectedAppointmentIds.length - 2),
      recoveredCapacity: Math.min(metrics.recoveredCapacity + 2, disruption.affectedAppointmentIds.length - 3),
      recoverySuccessRate: Math.min(metrics.recoverySuccessRate + 5, 95),
      timeSavedMinutes: metrics.timeSavedMinutes + 60,
    };
    onProgress(metrics);
  }

  await a2aBus.send("front-desk", "broadcast", "overflow.respond", {
    status: "completed",
    recovered: metrics.recoveredCapacity,
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "recovery",
    title: "Disruption Recovery Complete",
    description: `${metrics.patientsRebooked} patients rebooked, ${metrics.recoveredCapacity} slots recovered in PAS ledger.`,
    agentId: "front-desk",
  });

  return {
    ...disruption,
    status: "completed",
    completedAt: new Date().toISOString(),
    metrics,
    recoveredAppointmentIds: disruption.affectedAppointmentIds.slice(0, metrics.recoveredCapacity),
  };
}

export async function detectCalendarConflict(
  appointmentDateTime: string,
  onTimeline: (event: TimelineEvent) => void
): Promise<string> {
  const conflictEvent = "Work Team Standup";
  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "conflict",
    title: "Calendar Conflict Detected",
    description: `Conflict with "${conflictEvent}" detected by Personal Agent.`,
    agentId: "personal",
  });

  await a2aBus.send("personal", "front-desk", "calendar.sync", {
    conflict: conflictEvent,
    originalSlot: appointmentDateTime,
  });

  const alternative = addDays(new Date(appointmentDateTime), 1).toISOString();

  await a2aBus.send("front-desk", "personal", "appointment.confirm", {
    rescheduled: true,
    newSlot: alternative,
    ledger: PAS_LEDGER_NAME,
  });

  onTimeline({
    id: generateId("tl"),
    timestamp: new Date().toISOString(),
    type: "calendar",
    title: "PAS Ledger Rescheduled",
    description: "Front Desk Agent updated slot in System C IAR automatically.",
    agentId: "front-desk",
  });

  return alternative;
}
