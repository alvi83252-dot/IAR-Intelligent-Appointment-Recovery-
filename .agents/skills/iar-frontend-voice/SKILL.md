---
name: iar-frontend-voice
description: How to build the IAR edge layer — the Next.js + CopilotKit frontend, the AG-UI iar_timeline negotiation panel, A2UI cards (slot picker, swap consent, escalation, disruption), ElevenLabs voice (Scribe v2 STT + streaming TTS), and Google Calendar integration. Use this skill for ANY work under frontend/ or agents/personal/calendar_client.py, and whenever a task mentions voice, speech, TTS, STT, ElevenLabs, CopilotKit, AG-UI, A2UI, generative UI, timeline, calendar events, .ics, or demo operator controls.
---

# IAR Frontend, Voice & Calendar

Canonical spec: `CLAUDE.md` §AG-UI negotiation timeline, §Edge layer.
Companion skills: install CopilotKit's own agent skills (their repo ships
them) and the ElevenLabs skills repo (github.com/elevenlabs/skills) — use
those for SDK mechanics; use THIS skill for how IAR wires them together.

## The boundary rule

Voice, calendar, and UI payloads exist ONLY in the edge layer and
personal-agent internals. Nothing from ElevenLabs or Google Calendar ever
crosses the A2A boundary. If a change requires an agent-to-agent message to
carry audio, calendar objects, or component trees (beyond A2UI JSON relayed
to the client shell), the design is wrong — stop and restructure.

## AG-UI timeline panel (build EARLY — it is also our debugger)

Personal agent emits one event per externally visible state change:

```json
{ "kind": "iar_timeline",
  "step": "discovery | scoring | slot_search | swap_proposal | swap_response | overflow | disruption | escalation | confirmation",
  "actor": "personal | frontdesk:<practice_id> | research",
  "summary": "Proposed swap to Mrs Patel's agent (candidate 1/3)",
  "status": "started | succeeded | declined | failed | timeout",
  "ts": "ISO 8601" }
```

Rules: summaries ≤90 chars, human-readable, no refs/jargon; declines,
timeouts and retries rendered honestly (a visible retry is a feature);
disruption-mode frontdesk events relay through the personal agent. Render as
a live vertical timeline beside the chat, newest at bottom, status icons per
state. During development, the timeline is the first place to look when a
chain stalls — keep it truthful.

## A2UI cards

Four cards, all declarative A2UI JSON rendered by the client shell:
1. **Slot picker** — list of offers (time, clinician, location, reserved-pool
   badge), tap to book.
2. **Swap consent** — current vs proposed side by side, the human `reason`,
   the incentive, Accept / Decline. Auto-declined conflicts never render.
3. **Escalation** — unmissable, single action: Call 111 (or 999 text). No
   booking UI on this card at all.
4. **Disruption notice** — cancelled booking + replacement offers in one
   card; accepting an offer behaves like the slot picker.

Keep card payload generation in one frontend-facing module of the personal
agent so schema drift is caught in one place.

## Voice (ElevenLabs)

**Build STT and TTS as separate, independently testable elements (project
rule).** Implement Scribe v2 STT and streaming TTS as standalone modules
(e.g. `frontend/lib/voice/stt.*` and `frontend/lib/voice/tts.*`) with their own
isolated test harness / sandbox page, fully decoupled from the booking / A2A
flow. Validate each alone first (record → transcribe; text → stream-and-play);
only wire them into the edge layer afterwards. The system must always run
text-only with voice disabled (zero functional loss), so voice is an additive,
later step.

- STT: Scribe v2 (`model_id: scribe_v2`), en-GB primary.
- TTS: STREAMING endpoint, start playback on the first chunk — never batch.
- During A2A round-trips speak a short honest filler ("Let me check with the
  surgery…") — it covers multi-hop latency and doubles as status.
- Voice AND UI, never voice instead of UI: speak the offers, render the card,
  accept by tap or by voice ("the Monday one" → resolve against the
  currently rendered offers, not a fresh search).
- ElevenLabs down → text-only UI with zero functional loss
  (tests/test_degradation.py covers this).

## Calendar (Google Calendar API, personal agent only)

- READ #1 — conflict watch: new calendar event overlapping a known booking →
  personal agent proactively opens the rebook flow and tells the patient
  (voice + UI). This IS the DNA-prevention demo beat; don't bury it.
- READ #2 — swap pre-check: inbound proposal slot conflicts hard with the
  calendar → auto-decline `reason: calendar_conflict` WITHOUT asking the
  patient; soft/no conflict → render the consent card.
- WRITE — on `iar.booking_confirmation` (status confirmed/rebooked) create or
  move the event from `calendar_hint`; on cancelled/disruption delete it.
- FALLBACK — `.ics` generation (the `ics` package) for SMS/email paths and
  whenever the Calendar API is down; attach in chat too.

## Demo operator controls

A small operator panel in the frontend (NOT an A2A capability): "mark
clinician absent on <date>" → calls the frontdesk admin endpoint to trigger
the disruption cascade live; a reset button restores seed data. Keep these
behind an `?operator=1` flag so the patient view stays clean.

## Definition of done for any edge-layer change

- [ ] STT and TTS each built and tested as standalone modules before any edge-layer wiring
- [ ] Works with voice disabled (text-only parity)
- [ ] Works with Calendar API mocked away (.ics fallback fires)
- [ ] Timeline shows the change's new states truthfully
- [ ] No edge-layer type leaked into agents/common/schemas.py
