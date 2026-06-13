# IAR — Intelligent Appointment Recovery

**AI Agents That Keep Healthcare Moving.**

IAR is a patient-facing, GP-side appointment orchestration platform. AI agents negotiate scheduling, prioritization, swaps, and disruption recovery — reading and writing to **System C IAR** as the PAS/EPR ledger. IAR complements the record system; it does not replace it.

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
| **System C IAR** | NHS PAS/EPR ledger — Front Desk Agent reads/writes via adapter |
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
| `/api/pas` | System C IAR ledger snapshot |
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
