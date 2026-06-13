import { addDays, addHours, setHours, setMinutes } from "date-fns";
import type {
  Appointment,
  CapacityMetrics,
  DemoScenario,
  DisruptionEvent,
  Notification,
  Patient,
  Provider,
  SwapProposal,
  TimelineEvent,
} from "@/types";
import type { PasSlot } from "@/types/pas";

const now = new Date();
const GP_PRACTICE = "Riverside GP Surgery";

function slot(days: number, hour: number, minute = 0): string {
  return setMinutes(setHours(addDays(now, days), hour), minute).toISOString();
}

export const DEMO_PATIENT: Patient = {
  id: "patient_001",
  name: "Sarah Mitchell",
  email: "sarah.mitchell@email.com",
  phone: "+44 7700 900123",
  preferences: {
    preferredTimes: ["morning", "early afternoon"],
    preferredDays: ["Monday", "Tuesday", "Wednesday"],
    notificationsEnabled: true,
  },
};

export const DEMO_PROVIDERS: Provider[] = [
  { id: "prov_001", name: "Dr. James Chen", specialty: "General Practice", location: GP_PRACTICE },
  { id: "prov_002", name: "Dr. Emily Watson", specialty: "General Practice", location: GP_PRACTICE },
  { id: "prov_003", name: "Dr. Michael Patel", specialty: "General Practice", location: GP_PRACTICE },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt_001",
    patientId: "patient_001",
    patientName: "Sarah Mitchell",
    providerId: "prov_001",
    providerName: "Dr. James Chen",
    specialty: "General Practice",
    dateTime: slot(5, 10, 30),
    duration: 15,
    status: "confirmed",
    priorityScore: 45,
    priorityBand: "moderate",
    symptoms: "Persistent lower back pain",
    location: `${GP_PRACTICE}, Room 2`,
  },
  {
    id: "apt_002",
    patientId: "patient_002",
    patientName: "Robert Hughes",
    providerId: "prov_001",
    providerName: "Dr. James Chen",
    specialty: "General Practice",
    dateTime: slot(3, 14, 0),
    duration: 15,
    status: "confirmed",
    priorityScore: 25,
    priorityBand: "routine",
    symptoms: "Annual health check",
    location: `${GP_PRACTICE}, Room 2`,
  },
  {
    id: "apt_003",
    patientId: "patient_003",
    patientName: "Amelia Foster",
    providerId: "prov_002",
    providerName: "Dr. Emily Watson",
    specialty: "General Practice",
    dateTime: slot(7, 9, 0),
    duration: 15,
    status: "confirmed",
    priorityScore: 35,
    priorityBand: "moderate",
    symptoms: "Follow-up blood pressure review",
    location: `${GP_PRACTICE}, Room 3`,
  },
  {
    id: "apt_004",
    patientId: "patient_004",
    patientName: "David Clarke",
    providerId: "prov_001",
    providerName: "Dr. James Chen",
    specialty: "General Practice",
    dateTime: slot(2, 11, 0),
    duration: 15,
    status: "confirmed",
    priorityScore: 20,
    priorityBand: "routine",
    symptoms: "Prescription renewal",
    location: `${GP_PRACTICE}, Room 2`,
  },
];

export const INITIAL_PAS_SLOTS: PasSlot[] = [
  { id: "slot_1", dateTime: slot(2, 9, 0), providerId: "prov_001", providerName: "Dr. James Chen", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "available" },
  { id: "slot_2", dateTime: slot(2, 11, 30), providerId: "prov_001", providerName: "Dr. James Chen", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "available" },
  { id: "slot_3", dateTime: slot(3, 14, 0), providerId: "prov_001", providerName: "Dr. James Chen", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "booked" },
  { id: "slot_4", dateTime: slot(4, 10, 0), providerId: "prov_002", providerName: "Dr. Emily Watson", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "available" },
  { id: "slot_5", dateTime: slot(6, 15, 30), providerId: "prov_003", providerName: "Dr. Michael Patel", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "available" },
  { id: "slot_6", dateTime: slot(5, 10, 30), providerId: "prov_001", providerName: "Dr. James Chen", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "booked" },
  { id: "slot_7", dateTime: slot(2, 11, 0), providerId: "prov_001", providerName: "Dr. James Chen", practiceId: "gp_001", practiceName: GP_PRACTICE, duration: 15, status: "booked" },
];

export const INITIAL_SWAP_PROPOSALS: SwapProposal[] = [
  {
    id: "swap_001",
    urgentPatientId: "patient_005",
    urgentPatientName: "James Patterson",
    candidatePatientId: "patient_002",
    candidatePatientName: "Robert Hughes",
    urgentAppointmentId: "apt_pending",
    candidateAppointmentId: "apt_002",
    proposedSlot: slot(3, 14, 0),
    rationale:
      "James Patterson reports worsening symptoms. Research Agent elevated priority to urgent. No urgent GP slots available — Robert Hughes holds a routine appointment that can be deferred.",
    impactAnalysis: {
      urgentWaitReduction: "14 days → 3 days",
      candidateDelay: "+5 days (still within routine window)",
      capacityImpact: "Zero net capacity loss — slot reused in PAS ledger",
    },
    status: "pending",
    createdAt: addHours(now, -1).toISOString(),
  },
];

export const INITIAL_DISRUPTION: DisruptionEvent = {
  id: "disruption_001",
  type: "doctor_absence",
  providerId: "prov_001",
  providerName: "Dr. James Chen",
  affectedAppointmentIds: [
    "apt_001", "apt_002", "apt_004", "apt_005", "apt_006", "apt_007",
    "apt_008", "apt_009", "apt_010", "apt_011", "apt_012", "apt_013", "apt_014", "apt_015",
  ],
  recoveredAppointmentIds: ["apt_002", "apt_004", "apt_001"],
  status: "recovering",
  startedAt: addHours(now, -2).toISOString(),
  metrics: {
    recoveredCapacity: 11,
    patientsRebooked: 9,
    recoverySuccessRate: 78.6,
    timeSavedMinutes: 420,
  },
};

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_001",
    title: "Appointment Confirmed",
    message: "Your GP appointment with Dr. James Chen is confirmed for next week.",
    type: "success",
    read: false,
    createdAt: addHours(now, -24).toISOString(),
  },
  {
    id: "notif_002",
    title: "Swap Proposal Available",
    message: "A slot swap has been proposed to expedite urgent care. Review in Swap Center.",
    type: "warning",
    read: false,
    createdAt: addHours(now, -1).toISOString(),
  },
  {
    id: "notif_003",
    title: "Calendar Conflict Detected",
    message: "Personal Agent detected a conflict with your work meeting. Alternative slot found.",
    type: "info",
    read: true,
    createdAt: addHours(now, -48).toISOString(),
  },
];

export const INITIAL_TIMELINE: TimelineEvent[] = [
  {
    id: "tl_001",
    timestamp: addHours(now, -72).toISOString(),
    type: "request",
    title: "Appointment Requested",
    description: "Sarah Mitchell requested a GP consultation for persistent back pain.",
    agentId: "personal",
  },
  {
    id: "tl_002",
    timestamp: addHours(now, -71).toISOString(),
    type: "assessment",
    title: "Priority Assessed",
    description: "Research Agent assigned moderate priority (score: 45/100).",
    agentId: "research",
  },
  {
    id: "tl_003",
    timestamp: addHours(now, -70).toISOString(),
    type: "booking",
    title: "PAS Ledger Updated",
    description: "Front Desk Agent wrote booking to System C IAR for Dr. James Chen.",
    agentId: "front-desk",
  },
  {
    id: "tl_004",
    timestamp: addHours(now, -48).toISOString(),
    type: "conflict",
    title: "Calendar Conflict Resolved",
    description: "Personal Agent detected work meeting conflict and requested alternative slot.",
    agentId: "personal",
  },
  {
    id: "tl_005",
    timestamp: addHours(now, -1).toISOString(),
    type: "swap",
    title: "Swap Proposal Generated",
    description: "Front Desk Agent proposed slot exchange via PAS ledger.",
    agentId: "front-desk",
  },
];

export const CAPACITY_METRICS: CapacityMetrics = {
  totalSlots: 84,
  bookedSlots: 68,
  recoveredSlots: 11,
  utilizationRate: 81,
  avgWaitDays: 12.4,
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scenario_1",
    name: "Appointment Request",
    description: "Patient requests GP appointment → Research assesses → Front Desk writes to PAS ledger",
    steps: [
      "Patient submits symptoms and availability",
      "Research Agent evaluates urgency",
      "Front Desk Agent queries System C IAR",
      "Appointment confirmed and calendar synced",
    ],
  },
  {
    id: "scenario_2",
    name: "Calendar Conflict",
    description: "Personal Agent detects conflict → Front Desk reschedules via PAS ledger",
    steps: [
      "Personal Agent scans patient calendar",
      "Conflict detected with existing event",
      "Front Desk Agent updates PAS ledger slot",
      "Appointment automatically adjusted",
    ],
  },
  {
    id: "scenario_3",
    name: "Urgent Patient Swap",
    description: "Urgent GP patient needs earlier slot → Swap proposed → Patient accepts",
    steps: [
      "Patient reports worsening symptoms",
      "Research Agent elevates priority",
      "Front Desk identifies swap candidate in ledger",
      "Swap proposal sent for approval",
    ],
  },
  {
    id: "scenario_4",
    name: "GP Partner Absence",
    description: "GP unavailable → appointments impacted → Disruption Cascade recovers capacity",
    steps: [
      "GP absence notification from PAS ledger",
      "Disruption Cascade initiated",
      "Appointments reprioritized",
      "Partner surgery overflow routing",
      "Patients notified and rebooked",
    ],
  },
];
