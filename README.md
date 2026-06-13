# IAR — Intelligent Appointment Routing

**AI Agents That Keep Healthcare Moving.**

IAR is a patient-facing, GP-side appointment orchestration platform. AI agents negotiate scheduling, prioritization, swaps, and disruption recovery — reading and writing to **System C CareFlow** as the PAS/EPR ledger. IAR complements the record system; it does not replace it.

## For AI coding agents

This repo is set up for Claude Code, Cursor, and OpenAI Codex. Before coding, read:

- **[`CLAUDE.md`](./CLAUDE.md)** — canonical build spec (Agent Cards, `iar.*` schemas, algorithms, degradation ladder). Auto-loaded by Claude Code.
- **[`AGENTS.md`](./AGENTS.md)** — shared rules for Cursor & Codex (summary + pointer to the canonical docs).
- **[`IAR_PROJECT_SPEC.md`](./IAR_PROJECT_SPEC.md)** — full project specification.
- **[`.cursor/rules/iar.mdc`](./.cursor/rules/iar.mdc)** — Cursor always-apply rule.

Project skills live in `.agents/skills/` (also exposed to Claude Code via `.claude/skills`): `iar-a2a-agents`, `iar-domain-rules`, `iar-frontend-voice`.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

| Layer | Role |
|-------|------|
| **IAR** | Patient-facing orchestration — agents negotiate appointments |
| **System C CareFlow** | NHS PAS/EPR ledger — Front Desk Agent reads/writes via adapter |
| **Personal Agent** | Patient representative — calendar, preferences, notifications |
| **Research Agent** | GP priority scoring and triage |
| **Front Desk Agent** | PAS ledger coordinator — availability, booking, recovery |

## Demo Mode

```env
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

All agents, A2A communication, and PAS ledger operations run locally with mock data.

## Pages

- `/` — Landing (scroll animations, complement positioning)
- `/dashboard` — Patient dashboard
- `/request` — GP appointment request
- `/priority` — Research Agent assessment
- `/confirmation` — Booking + ICS download
- `/timeline` — Activity history
- `/swap` — Slot exchange center
- `/disruption` — GP partner absence recovery
- `/practice` — PAS Ledger integration view (agent writes, not staff admin)
- `/agents` — Agent Activity Center
- `/demo` — Demo Control Center

## API Routes

| Endpoint | Description |
|----------|-------------|
| `/api/agents` | Agent cards |
| `/api/a2a` | A2A message bus |
| `/api/pas` | System C CareFlow ledger snapshot |
| `/api/priority` | Priority assessment |
| `/api/appointments` | Appointment data |

## Scripts

```bash
npm run dev
npm run build
npm run test
```

## Tech Stack

Next.js 15 · React 19 · TypeScript · TailwindCSS · Framer Motion · Zustand
