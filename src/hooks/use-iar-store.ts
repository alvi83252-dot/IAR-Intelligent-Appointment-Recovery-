"use client";

import { create } from "zustand";
import { a2aBus } from "@/agents/a2a-bus";
import { AGENT_CARDS } from "@/agents/agent-cards";
import type {
  A2AMessage,
  AgentCard,
  AgentStatus,
  Appointment,
  DisruptionEvent,
  Notification,
  PriorityAssessment,
  SwapProposal,
  TimelineEvent,
} from "@/types";
import type { PasLedgerSnapshot, PasWriteLog } from "@/types/pas";
import {
  CAPACITY_METRICS,
  INITIAL_APPOINTMENTS,
  INITIAL_DISRUPTION,
  INITIAL_NOTIFICATIONS,
  INITIAL_PAS_SLOTS,
  INITIAL_SWAP_PROPOSALS,
  INITIAL_TIMELINE,
} from "@/services/mock-data";
import { pasAdapter } from "@/services/pas-adapter";
import {
  detectCalendarConflict,
  processAppointmentRequest,
  processSwapAcceptance,
  processSwapDecline,
  runDisruptionCascade,
} from "@/services/orchestrator";
import type { AppointmentRequest } from "@/types";
import type { PatientContact } from "@/types";

pasAdapter.initialize(INITIAL_PAS_SLOTS, INITIAL_APPOINTMENTS);

interface IARState {
  appointments: Appointment[];
  swapProposals: SwapProposal[];
  disruption: DisruptionEvent;
  notifications: Notification[];
  timeline: TimelineEvent[];
  a2aMessages: A2AMessage[];
  agentCards: AgentCard[];
  lastAssessment: PriorityAssessment | null;
  lastBookedAppointment: Appointment | null;
  patientContact: PatientContact | null;
  lastNotificationResults: Array<{
    channel: string;
    success: boolean;
    demo: boolean;
    fallback?: boolean;
    message: string;
    detail?: string;
  }> | null;
  lastCalendarResult: {
    success: boolean;
    demo: boolean;
    fallback?: boolean;
    provider: string;
    message: string;
    calendlyUrl?: string;
  } | null;
  capacityMetrics: typeof CAPACITY_METRICS;
  pasSnapshot: PasLedgerSnapshot;
  pasWriteLog: PasWriteLog[];
  isProcessing: boolean;
  demoScenarioRunning: string | null;

  initA2A: () => () => void;
  refreshPasLedger: () => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  submitAppointmentRequest: (request: AppointmentRequest) => Promise<Appointment>;
  acceptSwap: (proposalId: string) => Promise<void>;
  declineSwap: (proposalId: string) => Promise<void>;
  runDisruptionRecovery: () => Promise<void>;
  runCalendarConflictDemo: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  resetDemo: () => void;
}

export const useIARStore = create<IARState>((set, get) => ({
  appointments: INITIAL_APPOINTMENTS,
  swapProposals: INITIAL_SWAP_PROPOSALS,
  disruption: INITIAL_DISRUPTION,
  notifications: INITIAL_NOTIFICATIONS,
  timeline: INITIAL_TIMELINE,
  a2aMessages: [],
  agentCards: AGENT_CARDS,
  lastAssessment: null,
  lastBookedAppointment: null,
  patientContact: null,
  lastNotificationResults: null,
  lastCalendarResult: null,
  capacityMetrics: CAPACITY_METRICS,
  pasSnapshot: pasAdapter.getSnapshot(),
  pasWriteLog: pasAdapter.getWriteLog(),
  isProcessing: false,
  demoScenarioRunning: null,

  initA2A: () => {
    const unsubscribe = a2aBus.subscribe((messages) => {
      set({ a2aMessages: messages });
    });
    return unsubscribe;
  },

  refreshPasLedger: () => {
    set({
      pasSnapshot: pasAdapter.getSnapshot(),
      pasWriteLog: pasAdapter.getWriteLog(),
      appointments: pasAdapter.getAppointments(),
    });
  },

  setAgentStatus: (agentId, status) => {
    set((state) => ({
      agentCards: state.agentCards.map((card) =>
        card.id === agentId ? { ...card, status } : card
      ),
    }));
  },

  submitAppointmentRequest: async (request) => {
    set({ isProcessing: true, demoScenarioRunning: "scenario_1" });
    get().setAgentStatus("personal", "processing");
    get().setAgentStatus("research", "processing");
    get().setAgentStatus("front-desk", "processing");

    try {
      const appointment = await processAppointmentRequest(
        request,
        (event) => get().addTimelineEvent(event),
        (assessment) => set({ lastAssessment: assessment })
      );

      get().refreshPasLedger();

      set((state) => ({
        lastBookedAppointment: appointment,
        patientContact: {
          name: request.patientName,
          email: request.email,
          phone: request.phone,
        },
        notifications: [
          {
            id: `notif_${Date.now()}`,
            title: "Appointment Confirmed",
            message: `Your GP appointment with ${appointment.providerName} has been confirmed.`,
            type: "success",
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...state.notifications,
        ],
      }));

      return appointment;
    } finally {
      get().setAgentStatus("personal", "completed");
      get().setAgentStatus("research", "completed");
      get().setAgentStatus("front-desk", "completed");
      set({ isProcessing: false, demoScenarioRunning: null });
    }
  },

  acceptSwap: async (proposalId) => {
    const proposal = get().swapProposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    set({ isProcessing: true, demoScenarioRunning: "scenario_3" });
    await processSwapAcceptance(proposal, (event) => get().addTimelineEvent(event));
    get().refreshPasLedger();

    set((state) => ({
      swapProposals: state.swapProposals.map((p) =>
        p.id === proposalId ? { ...p, status: "accepted" as const } : p
      ),
      notifications: [
        {
          id: `notif_${Date.now()}`,
          title: "Swap Completed",
          message: "Slot exchange completed. Urgent patient receives earlier GP care.",
          type: "success",
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ],
      isProcessing: false,
      demoScenarioRunning: null,
    }));
  },

  declineSwap: async (proposalId) => {
    const proposal = get().swapProposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    set({ isProcessing: true });
    await processSwapDecline(proposal, (event) => get().addTimelineEvent(event));

    set((state) => ({
      swapProposals: state.swapProposals.map((p) =>
        p.id === proposalId ? { ...p, status: "declined" as const } : p
      ),
      isProcessing: false,
    }));
  },

  runDisruptionRecovery: async () => {
    set({ isProcessing: true, demoScenarioRunning: "scenario_4" });
    get().setAgentStatus("front-desk", "processing");

    const updated = await runDisruptionCascade(
      get().disruption,
      (event) => get().addTimelineEvent(event),
      (metrics) =>
        set((state) => ({
          disruption: { ...state.disruption, metrics },
        }))
    );

    get().refreshPasLedger();

    set((state) => ({
      disruption: updated,
      capacityMetrics: {
        ...state.capacityMetrics,
        recoveredSlots: updated.metrics.recoveredCapacity,
      },
      notifications: [
        {
          id: `notif_${Date.now()}`,
          title: "Disruption Recovery Complete",
          message: `${updated.metrics.patientsRebooked} patients rebooked via PAS ledger.`,
          type: "info",
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ],
      isProcessing: false,
      demoScenarioRunning: null,
    }));

    get().setAgentStatus("front-desk", "completed");
  },

  runCalendarConflictDemo: async () => {
    const apt = get().appointments[0];
    if (!apt) return;

    set({ isProcessing: true, demoScenarioRunning: "scenario_2" });
    const newSlot = await detectCalendarConflict(apt.dateTime, (event) =>
      get().addTimelineEvent(event)
    );

    await pasAdapter.rescheduleAppointment(apt.id, newSlot);
    get().refreshPasLedger();

    set({ isProcessing: false, demoScenarioRunning: null });
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  addTimelineEvent: (event) => {
    set((state) => ({
      timeline: [event, ...state.timeline],
    }));
  },

  resetDemo: () => {
    a2aBus.clear();
    pasAdapter.reset(INITIAL_PAS_SLOTS, INITIAL_APPOINTMENTS);
    set({
      appointments: INITIAL_APPOINTMENTS,
      swapProposals: INITIAL_SWAP_PROPOSALS,
      disruption: INITIAL_DISRUPTION,
      notifications: INITIAL_NOTIFICATIONS,
      timeline: INITIAL_TIMELINE,
      a2aMessages: [],
      agentCards: AGENT_CARDS,
      lastAssessment: null,
      lastBookedAppointment: null,
      patientContact: null,
      lastNotificationResults: null,
      lastCalendarResult: null,
      capacityMetrics: CAPACITY_METRICS,
      pasSnapshot: pasAdapter.getSnapshot(),
      pasWriteLog: pasAdapter.getWriteLog(),
      isProcessing: false,
      demoScenarioRunning: null,
    });
  },
}));
