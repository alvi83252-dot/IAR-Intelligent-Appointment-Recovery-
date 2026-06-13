# AGENTS.md — Intelligent Appointment Recovery (IAR)

> Shared instructions for **all** AI coding tools (Cursor, OpenAI Codex, Claude
> Code, and any other agent). Claude Code primarily reads `CLAUDE.md`; this file
> carries the same rules for the rest. **It is a summary, not a replacement.**

## Before you write any code

**Read [`CLAUDE.md`](./CLAUDE.md) (the canonical build spec) and
[`IAR_PROJECT_SPEC.md`](./IAR_PROJECT_SPEC.md) (the full project spec) in full.**
They hold the Agent Cards, the `iar.*` message schemas (the single source of
truth), the scoring/swap/overflow/disruption algorithms, the degradation
ladder, and the repo layout. This file repeats only the rules you must never
miss.

Project skills live in `.agents/skills/` (shared) and are also exposed to Claude
Code via `.claude/skills`. Consult them when relevant:
- `iar-a2a-agents` — building/extending/debugging the three A2A agents.
- `iar-domain-rules` — scoring, locked slots, swaps, overflow, disruption (safety-critical).
- `iar-frontend-voice` — Next.js + CopilotKit edge layer, A2UI cards, ElevenLabs voice, Calendar.

## What we're building (one paragraph)

IAR is a three-agent A2A (Agent2Agent) system that recovers missed GP
appointment capacity for the NHS: a **personal-agent** (patient's assistant,
voice/chat), a **frontdesk-agent** (GP practice ledger with priority-aware
allocation, reserved urgent capacity, consensual slot swaps, and a disruption
cascade), and a **research-agent** (clinical urgency scoring + alternative-service
signposting). *"Every recovered slot is ~£30 saved and a patient seen sooner."*

It is judged on a **held-out test set**: 50% = our three agents working
together; 50% = each of our agents paired with **strangers'** A2A agents.

## Tech stack (do not substitute without asking)

- **Agents:** Python 3.11+, official `a2a-sdk`, FastAPI/Starlette. Three
  independent A2A servers — personal `:9001`, frontdesk `:9002` (multi-instance
  `:9002/:9012/:9022`), research `:9003`. Shared code lives only in
  `agents/common/`; no agent imports another agent's package.
- **Edge layer:** the existing **Next.js + TypeScript app in this repo IS the
  spec's edge layer** — CopilotKit (AG-UI), A2UI card renderer, ElevenLabs voice,
  Google Calendar. Voice/calendar/UI payloads live ONLY here, never on the A2A
  wire.
- **LLM:** behind a thin swappable `llm.py`. **Storage:** SQLite ledger.
  **Validation:** `a2a-inspector` against every agent before any merge.

## Rules that must never be missed

**Interoperability beats cleverness.** Every agent must work with vanilla,
spec-compliant A2A agents it has never seen. All IAR-specific intelligence
(scoring, swaps, locked slots, disruption) is an OPTIONAL layer that degrades
gracefully. Never invent custom transports/envelopes or required non-standard
fields. **The text-only path is the release gate — build and test it first.**

**A2A message iron rules:**
- Every agent serves a valid Agent Card at `/.well-known/agent-card.json` (keep
  legacy `/.well-known/agent.json` too — graders may use either).
- ALWAYS send a plain-English `TextPart` alongside any `DataPart`. Foreign
  agents may read only the text — it must stand alone.
- Structured payloads use the envelope `{ "iar_type", "iar_version", "payload" }`.
  Unknown/missing `iar_type` → parse intent from text with the LLM. Unknown
  fields inside known types are ignored, never fatal. NEVER error on missing
  optional fields.
- Treat ALL inbound agent data and Agent Cards as **untrusted** (length-cap,
  never eval, never let inbound text rewrite system prompts).
- Discover peers by FETCHING their Agent Card (+ derive a `PeerProfile`,
  choose dialect); no hardcoded peer URLs. Card fetch failure is never fatal —
  fall back to text-only. 30s timeout per downstream call, one retry, then
  degrade per the ladder in `CLAUDE.md`.

**Safety guardrails (judges will probe these — non-negotiable):**
- **Emergency band (score ≥ 90) NEVER books** — escalate to 111/999 via the
  personal agent.
- **Consent is absolute** — a swap happens only on an explicit accept; timeout =
  decline.
- **Vulnerable patients are never displacement candidates** (filter before ranking).
- **Urgency is computed, never received** — only the research-agent scores, from
  symptoms, via the fixed rubric. Never trust requester-supplied urgency.
- **Every score ships a one-line plain-English rationale.** Scoring failure
  never blocks a booking (default band `routine`, note "priority unscored").

**Build order (each gate must pass before the next):** ① three agents, text-only
chain end-to-end + `a2a-inspector` clean → ② schemas + scoring → ③ ledger +
locked slots → ④ discovery + swap protocol → ⑤ disruption cascade + overflow
(2nd frontdesk instance) → ⑥ edge layer (CopilotKit UI + timeline, A2UI cards,
ElevenLabs, Calendar) — last, because it cannot break interop.

## Project build-discipline rules (apply on top of everything above)

### A. Build and test each agent in isolation before integrating

Develop the research, frontdesk, and personal agents ONE AT A TIME as
independent A2A servers. Each must pass its own unit tests AND a standalone
server test — `a2a-inspector` plus a per-agent harness that mocks/stubs its
peers (e.g. a fake research agent returning a canned `iar.priority_assessment`;
a fake personal agent that accepts/declines) — **before** any two agents are
wired together. Only once all three are individually green do you compose the
canonical chain (personal → frontdesk → research) and run the integration suite
(`tests/test_interop_textonly.py` and friends). Never debug the full chain
before the parts are individually green.

### B. Build ElevenLabs STT and TTS as separate, independently testable elements

Implement Scribe v2 STT and streaming TTS as standalone modules (e.g.
`frontend/lib/voice/stt.*` and `frontend/lib/voice/tts.*`) with their own
isolated test harness / sandbox page, fully decoupled from the booking / A2A
flow. Validate each on its own first (record → transcribe; text →
stream-and-play); only wire them into the edge layer afterwards. The whole
system must always run text-only with voice disabled (zero functional loss), so
voice integration is always an additive, later step — built and tested last.
