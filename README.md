# IAR — Intelligent Appointment Recovery

**AI Agents That Keep Healthcare Moving.**

IAR is a patient-facing, GP-side appointment orchestration platform. AI agents negotiate scheduling, prioritization, swaps, and disruption recovery — reading and writing to **System C IAR** as the PAS/EPR ledger. IAR complements the record system; it does not replace it.

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

### Edge layer (Next.js app)

| Category | Technologies |
|----------|--------------|
| **Core** | Next.js 15 · React 19 · TypeScript 5 |
| **UI** | Tailwind CSS 3 · Framer Motion · Radix UI · Lucide · Zustand |
| **Agent chat** | CopilotKit (`@copilotkit/react-core`, `@copilotkit/runtime`) · AG-UI · Hono runtime handler |
| **Validation & tests** | Zod · Vitest |
| **Voice** | ElevenLabs Scribe v2 STT + streaming TTS (browser speech fallback when unavailable) |
| **Integrations** | Google Calendar & Gmail OAuth (`googleapis`) |

### A2A agents (Python)

| Category | Technologies |
|----------|--------------|
| **Runtime** | Python 3.12 · Google ADK (`google-adk[a2a]`) · `a2a-sdk` · uvicorn |
| **Agents** | `personal-agent` (`:9001`) · `cs-agent` front desk (`:9002`) |
| **Knowledge base** | Redis 8 + RediSearch — BM25 + vector search (Gemini embeddings) |
| **LLM access** | LiteLLM · swappable providers via env (FreeLLMAPI, Gemini, OpenAI-compatible) |

Shared LLM configuration lives in `agents/common/`; ADK agent servers in `personal_agent/` and `cs_agent/`. A dedicated research agent (`:9003`) is specified in [`CLAUDE.md`](./CLAUDE.md) and priority scoring currently runs in the Next.js edge layer.

### Infrastructure

Docker Compose (`personal-agent`, `cs-agent`, Redis, Next.js app) · optional bundled [FreeLLMAPI](./freellmapi/) for local OpenAI-compatible LLM routing

### Protocols

**A2A** (Agent-to-Agent, JSON-RPC over HTTP) between Python agents · **AG-UI** (CopilotKit) between the chat UI and the edge runtime · mock PAS ledger when `DEMO_MODE=true`
