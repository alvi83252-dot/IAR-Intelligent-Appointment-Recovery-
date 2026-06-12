import { PAS_LEDGER_NAME } from "@/lib/config";
import type { AgentCard } from "@/types";

export const AGENT_CARDS: AgentCard[] = [
  {
    id: "personal",
    name: "Personal Agent",
    role: "Patient Representative",
    description:
      "Patient-facing agent representing GP patient interests — preferences, calendar conflicts, notifications, and swap decisions.",
    version: "1.0.0",
    status: "idle",
    capabilities: [
      "Patient preference management",
      "Calendar conflict detection",
      "Notification orchestration",
      "Swap decision facilitation",
    ],
    skills: [
      { id: "pref-mgmt", name: "Preference Management", description: "Maintains patient scheduling preferences" },
      { id: "cal-sync", name: "Calendar Sync", description: "Detects and resolves calendar conflicts" },
      { id: "notif", name: "Notifications", description: "Manages patient notification delivery" },
    ],
    supportedTasks: [
      "appointment.request",
      "swap.respond",
      "calendar.sync",
      "overflow.respond",
    ],
    endpoint: "a2a://iar.agents/personal",
  },
  {
    id: "front-desk",
    name: "Front Desk Agent",
    role: "PAS Ledger Coordinator",
    description:
      `Reads and writes the ${PAS_LEDGER_NAME} PAS/EPR ledger. Searches GP availability, books appointments, and recovers capacity — never replaces the record system.`,
    version: "1.0.0",
    status: "idle",
    capabilities: [
      `${PAS_LEDGER_NAME} read/write adapter`,
      "GP availability search",
      "Capacity recovery",
      "Disruption handling",
      "Partner surgery overflow routing",
    ],
    skills: [
      { id: "pas-adapter", name: "PAS Adapter", description: `Integrates with ${PAS_LEDGER_NAME} ledger API` },
      { id: "capacity", name: "Capacity Optimization", description: "Maximizes GP slot utilization" },
      { id: "recovery", name: "Disruption Recovery", description: "Recovers from GP partner absences" },
    ],
    supportedTasks: [
      "appointment.request",
      "appointment.confirm",
      "swap.propose",
      "overflow.request",
      "disruption.notify",
      "calendar.sync",
    ],
    endpoint: "a2a://iar.agents/front-desk",
  },
  {
    id: "research",
    name: "Research Agent",
    role: "Healthcare Prioritization Specialist",
    description:
      "Assesses GP referral urgency, generates priority scores, provides rationale, and ranks appointment candidates.",
    version: "1.0.0",
    status: "idle",
    capabilities: [
      "Urgency assessment",
      "Priority scoring",
      "Clinical rationale generation",
      "Candidate ranking",
    ],
    skills: [
      { id: "triage", name: "Clinical Triage", description: "Evaluates symptom urgency for GP care" },
      { id: "scoring", name: "Priority Scoring", description: "Generates 0-100 priority scores" },
      { id: "ranking", name: "Candidate Ranking", description: "Ranks patients for slot allocation" },
    ],
    supportedTasks: ["priority.assess", "swap.propose", "overflow.request"],
    endpoint: "a2a://iar.agents/research",
  },
];
