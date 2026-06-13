export type PriorityBand = "routine" | "moderate" | "urgent" | "critical";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "pending_swap"
  | "recovered";

export type AgentId = "personal" | "front-desk" | "research";

export type A2ATask =
  | "appointment.request"
  | "appointment.confirm"
  | "priority.assess"
  | "swap.propose"
  | "swap.respond"
  | "overflow.request"
  | "overflow.respond"
  | "disruption.notify"
  | "calendar.sync";

export type AgentStatus = "idle" | "active" | "processing" | "completed";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
}

export interface AgentCard {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  version: string;
  status: AgentStatus;
  capabilities: string[];
  skills: AgentSkill[];
  supportedTasks: A2ATask[];
  endpoint: string;
}

export interface A2AMessage {
  id: string;
  timestamp: string;
  from: AgentId;
  to: AgentId | "broadcast";
  task: A2ATask;
  payload: Record<string, unknown>;
  status: "sent" | "received" | "processed";
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferences: {
    preferredTimes: string[];
    preferredDays: string[];
    notificationsEnabled: boolean;
  };
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  location: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  specialty: string;
  dateTime: string;
  duration: number;
  status: AppointmentStatus;
  priorityScore: number;
  priorityBand: PriorityBand;
  symptoms: string;
  location: string;
  notes?: string;
}

export interface PriorityAssessment {
  score: number;
  band: PriorityBand;
  rationale: string;
  confidence: number;
  recommendations: string[];
  assessedAt: string;
}

export interface SwapProposal {
  id: string;
  urgentPatientId: string;
  urgentPatientName: string;
  candidatePatientId: string;
  candidatePatientName: string;
  urgentAppointmentId: string;
  candidateAppointmentId: string;
  proposedSlot: string;
  rationale: string;
  impactAnalysis: {
    urgentWaitReduction: string;
    candidateDelay: string;
    capacityImpact: string;
  };
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: string;
}

export interface DisruptionEvent {
  id: string;
  type: "doctor_absence" | "equipment_failure" | "emergency_closure";
  providerId: string;
  providerName: string;
  affectedAppointmentIds: string[];
  recoveredAppointmentIds: string[];
  status: "active" | "recovering" | "completed";
  startedAt: string;
  completedAt?: string;
  metrics: {
    recoveredCapacity: number;
    patientsRebooked: number;
    recoverySuccessRate: number;
    timeSavedMinutes: number;
  };
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type:
    | "request"
    | "assessment"
    | "booking"
    | "conflict"
    | "swap"
    | "disruption"
    | "recovery"
    | "notification"
    | "calendar";
  title: string;
  description: string;
  agentId?: AgentId;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "urgent";
  read: boolean;
  createdAt: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  steps: string[];
}

export interface AppointmentRequest {
  symptoms: string;
  availability: string[];
  preferredProvider?: string;
  preferredSlotId?: string;
  urgencyNotes?: string;
  patientName: string;
  email: string;
  phone: string;
}

export interface PatientContact {
  name: string;
  email: string;
  phone: string;
}

export interface CapacityMetrics {
  totalSlots: number;
  bookedSlots: number;
  recoveredSlots: number;
  utilizationRate: number;
  avgWaitDays: number;
}
