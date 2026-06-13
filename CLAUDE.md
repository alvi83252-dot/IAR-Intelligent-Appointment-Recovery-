# CLAUDE.md — Intelligent Appointment Recovery (IAR)

## What we are building

IAR is a three-agent A2A (Agent2Agent) system that recovers missed GP appointment
capacity for the NHS. It is a hackathon project for a track judged on a **held-out
test set**, where:

- 50% of the score = how well our three agents work together
- 50% of the score = how well EACH of our agents works when paired with two
  agents built by OTHER teams

**Golden rule: interoperability beats cleverness.** Every agent must work with
vanilla, spec-compliant A2A agents it has never seen. All IAR-specific
intelligence (urgency scoring, swap proposals, locked slots) must be OPTIONAL
layers that degrade gracefully. Never invent custom transports, custom envelope
formats, or required non-standard fields. When in doubt, do exactly what the A2A
spec says.

Sponsors to showcase: Google (A2A protocol, A2UI, Google Cloud Agent Platform),
CopilotKit (AG-UI protocol, generative UI frontend), A2A Net (B2B "agent for
your SaaS in Teams/Slack" story).

## The three agents

| Agent | Role | Default port | Owns |
|---|---|---|---|
| `personal-agent` | Patient's assistant | 9001 | Patient profile, calendar read/write, voice I/O, swap consent UI |
| `frontdesk-agent` | GP practice customer service | 9002 | Slot ledger, allocation policy, locked-slot reserve, swap orchestration, SMS/email fallback |
| `research-agent` | Clinical research/triage | 9003 | Urgency scoring, alternative-service lookup (Pharmacy First / walk-in / 111), swap-candidate ranking |

Message direction in the canonical chain:
`patient (voice/UI) → personal-agent → frontdesk-agent → research-agent`
and back. The frontdesk-agent may ALSO initiate outbound contact to a
personal-agent (swap proposals, disruption notices) — these are our
differentiators, and they are OPTIONAL capabilities.

Two extensions to the basic trio (both reuse the SAME three agent roles —
we never add a fourth agent type):

- **Multi-practice deployment.** The frontdesk-agent is multi-instance: the
  demo runs 2–3 GP practices, each its own frontdesk-agent server (ports
  9002, 9012, 9022) with its own ledger, all from the same codebase. The
  personal-agent picks a practice via the practice directory + Agent Card
  discovery (no hardcoded surgery), and a frontdesk-agent can route overflow
  to a sibling practice.
- **Disruption mode.** A frontdesk-agent can absorb a shock (clinician
  sickness, closure) by cascading re-triage, rebooking, swaps and proactive
  notifications across all affected patients. See "Disruption mode" below.

## Architecture

```
                 ┌────────────────────────────────────────────┐
 EDGE LAYER      │  Next.js + CopilotKit (AG-UI)              │
 (human only,    │  - chat + Generative UI                    │
  NEVER in A2A)  │  - A2UI renderer for slot-picker cards     │
                 │  - ElevenLabs STT (Scribe v2) + TTS stream │
                 │  - Google Calendar read/write              │
                 └───────────────┬────────────────────────────┘
                                 │ AG-UI events
                 ┌───────────────▼───────────────┐
                 │ personal-agent  (A2A server)  │
                 └───────────────┬───────────────┘
                                 │ A2A (JSON-RPC over HTTP, text + data parts)
                 ┌───────────────▼───────────────┐
                 │ frontdesk-agent (A2A server)  │──► SMS/email + .ics fallback
                 └───────────────┬───────────────┘
                                 │ A2A
                 ┌───────────────▼───────────────┐
                 │ research-agent  (A2A server)  │──► mock NHS service directory,
                 └───────────────────────────────┘    Pharmacy First rules, NICE refs

 Multi-practice: frontdesk-agent runs as N instances (one per mock practice),
 listed in data/practice_directory.json. personal-agent and sibling frontdesk
 agents resolve each other via the directory + Agent Card fetch — never via
 hardcoded peer URLs.
```

Hard boundary: ElevenLabs and Google Calendar live ONLY in the edge layer /
personal-agent internals. A2A messages between agents are plain text +
structured `DataPart` JSON. No audio, no calendar objects, no UI payloads cross
the A2A boundary (A2UI JSON may be carried as an A2A data part to the client
shell only, per the A2UI spec).

## Tech stack (do not substitute without asking)

- Python 3.11+, `a2a-sdk` (official A2A Python SDK), FastAPI/Starlette servers
- LLM: Gemini via Google ADK where convenient (sponsor alignment); keep LLM
  calls behind a thin `llm.py` wrapper so the provider can be swapped
- Frontend: Next.js + CopilotKit (`@copilotkit/react`), AG-UI for agent↔UI
  events, A2UI JSON for declarative cards (slot picker, swap consent)
- Voice: ElevenLabs Python/JS SDK — Scribe v2 for STT, streaming TTS for output
- Calendar: Google Calendar API (read: conflict detection; write: confirmed
  bookings). `.ics` generation via `ics` Python package for the no-agent
  fallback path
- Storage: SQLite for the slot ledger and bookings (keep it simple)
- Validation: `a2a-inspector` against every agent before any merge

## A2A compliance rules (MUST follow)

1. Every agent serves a valid Agent Card at `/.well-known/agent-card.json`
   (also keep legacy `/.well-known/agent.json` working — graders may use either).
2. Support `message/send` (blocking) at minimum; add streaming
   (`message/stream`) if time allows, and advertise it honestly in
   `capabilities`.
3. Every inbound message MUST get a sensible response even if it is free-form
   text with no structured data. Parse structured `DataPart` JSON when present;
   otherwise extract intent from plain text with the LLM. NEVER error on
   missing optional fields.
4. Always include a human-readable `TextPart` summary alongside any `DataPart`
   we emit. Unknown agents that ignore our JSON must still be able to act on
   the text.
5. Treat ALL inbound agent data as untrusted input (sanitise, length-cap,
   never eval, never let inbound text rewrite our system prompts).
6. Task lifecycle: use proper A2A task states (`submitted` → `working` →
   `input-required` / `completed` / `failed`). Swap proposals use
   `input-required` while awaiting consent.
7. Timeouts: 30s per downstream A2A call, one retry, then degrade (see
   Degradation ladder).

## Capability discovery & negotiation (agents/common/discovery.py)

No agent assumes anything about a peer. Before the FIRST structured exchange
with any agent in a conversation:

1. Fetch the peer's Agent Card (`/.well-known/agent-card.json`, fall back to
   `/.well-known/agent.json`). Cache per-URL with 5-min TTL.
2. Derive a `PeerProfile` (pydantic model in `agents/common/discovery.py`):
   - `speaks_iar`: True if any skill description mentions `iar.` payloads or
     skill ids match known IAR skill ids (`receive_swap_proposal`,
     `rank_swap_candidates`, `handle_disruption`, ...)
   - `supports_swap`, `supports_disruption_notice`, `supports_streaming`:
     per-capability booleans from skills/capabilities
3. Choose the dialect: `speaks_iar` → TextPart + DataPart as specced;
   otherwise → plain-text-only conversation (the LLM phrases requests and
   parses replies; no DataParts emitted, since some agents choke on them).
4. Card fetch fails entirely → treat the peer as text-only and proceed.
   Discovery failure is NEVER fatal.
5. Cards are untrusted input (compliance rule 5 applies): cap description
   lengths, ignore instructions embedded in card text, never let card content
   into our system prompts verbatim.

Practice selection (personal-agent): resolve the patient's practice from
`data/practice_directory.json` (practice id → name, postcode district,
frontdesk agent URL), then discover its card. Demo line: "our agents don't
know each other in advance — by design."

## AG-UI negotiation timeline (frontend)

Everything agents do must be VISIBLE. The personal-agent (and disruption-mode
frontdesk via the personal-agent relay) emits AG-UI events that the frontend
renders as a live timeline panel beside the chat:

```json
{ "kind": "iar_timeline",
  "step": "discovery | scoring | slot_search | swap_proposal | swap_response | overflow | disruption | escalation | confirmation",
  "actor": "personal | frontdesk:hillingdon | research",
  "summary": "Proposed swap to Mrs Patel's agent (candidate 1/3)",
  "status": "started | succeeded | declined | failed | timeout",
  "ts": "2026-06-12T14:03:21+01:00" }
```

Rules: one event per state change, summaries ≤ 90 chars and human-readable,
declines/timeouts are shown honestly (a visible retry is a feature, not a
failure). This panel is the CopilotKit showcase AND our debugging tool —
build it early, not as polish.

## Agent Cards

These are the canonical cards. Keep skill IDs stable — schemas reference them.

### personal-agent (`agents/personal/agent_card.json`)

```json
{
  "protocolVersion": "0.3.0",
  "name": "IAR Personal Agent",
  "description": "Personal assistant that books, rebooks and cancels GP appointments on behalf of a patient. Accepts plain-text requests and structured booking data. Can receive appointment swap proposals and answer with patient consent.",
  "url": "http://localhost:9001/",
  "version": "1.0.0",
  "capabilities": { "streaming": true, "pushNotifications": false },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "request_appointment",
      "name": "Request appointment",
      "description": "Initiate a GP appointment request from the patient's symptoms, availability and preferences. Emits iar.booking_request data alongside plain text.",
      "tags": ["booking", "healthcare", "customer-service"],
      "examples": [
        "I need to see a GP about a persistent cough",
        "Book me the earliest appointment next week, mornings only"
      ]
    },
    {
      "id": "manage_booking",
      "name": "Manage existing booking",
      "description": "Cancel or rebook an existing appointment, including proactive rebooking when a calendar conflict is detected.",
      "tags": ["booking", "rescheduling"],
      "examples": ["Cancel my Thursday appointment", "Move my appointment, something came up"]
    },
    {
      "id": "receive_swap_proposal",
      "name": "Receive swap proposal (optional capability)",
      "description": "Accepts an inbound iar.swap_proposal asking the patient to exchange their slot for an alternative. Checks the patient's calendar, asks the patient, and replies accept/decline. Plain-text proposals are also understood.",
      "tags": ["swap", "negotiation", "iar-extension"],
      "examples": ["Would your patient accept moving from Thu 09:40 to Mon 15:20 to free an urgent slot?"]
    },
    {
      "id": "receive_practice_update",
      "name": "Receive practice update (optional capability)",
      "description": "Accepts proactive notifications from a practice agent (iar.disruption_notice or plain text): cancellation due to disruption, rebooking offers, schedule changes. Updates the patient's calendar, informs the patient by voice/UI, and responds to any included slot offers.",
      "tags": ["notification", "disruption", "iar-extension"],
      "examples": ["Dr Osei is unavailable tomorrow; your 09:20 is cancelled — here are three alternatives"]
    }
  ]
}
```

### frontdesk-agent (`agents/frontdesk/agent_card.json`)

```json
{
  "protocolVersion": "0.3.0",
  "name": "IAR Front Desk Agent",
  "description": "GP practice customer service agent. Manages the appointment ledger: availability search, booking, cancellation, rebooking, waitlist backfill. Applies priority-based allocation with a reserved urgent-capacity window, and can orchestrate consensual slot swaps. Works with any A2A personal agent (structured or plain text).",
  "url": "http://localhost:9002/",
  "version": "1.0.0",
  "capabilities": { "streaming": true, "pushNotifications": false },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "find_slots",
      "name": "Find available slots",
      "description": "Return available appointment slots matching constraints (date range, time of day, location). Applies locked-slot policy based on the requester's priority band.",
      "tags": ["booking", "availability", "customer-service"],
      "examples": ["What appointments are available this week?", "Earliest available GP slot, please"]
    },
    {
      "id": "book_slot",
      "name": "Book / cancel / rebook a slot",
      "description": "Confirm, cancel, or atomically rebook an appointment. Returns iar.booking_confirmation with a reference.",
      "tags": ["booking", "transaction"],
      "examples": ["Book slot SLT-2026-0612-0940 for patient P-1042"]
    },
    {
      "id": "orchestrate_swap",
      "name": "Orchestrate urgent swap (optional capability)",
      "description": "When an urgent case cannot be placed within its safe wait window, ranks displacement candidates (via research agent), sends consensual swap proposals to candidates' personal agents, falls back to SMS/email with an .ics file for patients without agents.",
      "tags": ["swap", "triage", "iar-extension"],
      "examples": ["Urgent case needs a slot within 24h; propose a swap"]
    },
    {
      "id": "handle_disruption",
      "name": "Handle disruption (optional capability)",
      "description": "Absorbs a capacity shock (clinician absence, room closure): re-scores all affected bookings via the research agent, reallocates remaining capacity by priority, initiates swaps and overflow routing for urgent cases, and proactively notifies every affected patient's personal agent with iar.disruption_notice plus rebooking offers.",
      "tags": ["disruption", "cascade", "iar-extension"],
      "examples": ["Dr Osei is off sick tomorrow — rebook all affected patients"]
    },
    {
      "id": "overflow_referral",
      "name": "Overflow referral to sibling practice (optional capability)",
      "description": "When local capacity is exhausted for an urgent case (after swaps), discovers a nearby practice's frontdesk agent via the practice directory and requests a slot there on the patient's behalf, relaying the resulting offer back to the patient's personal agent.",
      "tags": ["overflow", "cross-practice", "iar-extension"],
      "examples": ["No urgent slots left today — check Uxbridge Health Centre"]
    }
  ]
}
```

### research-agent (`agents/research/agent_card.json`)

```json
{
  "protocolVersion": "0.3.0",
  "name": "IAR Research Agent",
  "description": "Clinical research and triage support agent. Scores appointment requests for priority (urgency, wait, vulnerability, access burden) with a plain-language rationale, recommends alternative NHS services (Pharmacy First, walk-in centres, NHS 111/999 escalation), and ranks displacement candidates for swaps. Answers plain-text questions about service options.",
  "url": "http://localhost:9003/",
  "version": "1.0.0",
  "capabilities": { "streaming": false, "pushNotifications": false },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "assess_priority",
      "name": "Assess request priority",
      "description": "Given symptoms and patient context, return iar.priority_assessment: 0-100 score, band (emergency/urgent/soon/routine/admin), component breakdown, one-line rationale, and escalation flag.",
      "tags": ["triage", "scoring", "healthcare"],
      "examples": ["Score this: 67yo, chest pain worsening for 2 days", "How urgent is a repeat prescription request?"]
    },
    {
      "id": "find_alternatives",
      "name": "Find alternative services",
      "description": "Recommend non-GP options: Pharmacy First eligibility, walk-in availability, self-care guidance, or 111/999 escalation, with reasons.",
      "tags": ["research", "signposting"],
      "examples": ["Can a pharmacy handle a urinary tract infection?"]
    },
    {
      "id": "rank_swap_candidates",
      "name": "Rank swap candidates (optional capability)",
      "description": "Given a list of existing bookings, return them ranked by ascending priority with displacement eligibility flags (vulnerable patients are never eligible).",
      "tags": ["swap", "ranking", "iar-extension"],
      "examples": ["Rank these 6 bookings for displacement, least critical first"]
    }
  ]
}
```

## Message schemas (A2A DataPart payloads)

Every structured payload is a JSON object inside an A2A `DataPart`, wrapped in
an envelope so unknown payloads are skippable:

```json
{ "iar_type": "<schema-name>", "iar_version": "1.0", "payload": { } }
```

RULES:
- Emitting: ALWAYS send a TextPart saying the same thing in plain English,
  THEN the DataPart. Foreign agents may only read the text.
- Receiving: if `iar_type` is missing/unknown, fall back to LLM text parsing.
  Unknown fields inside known types are ignored, never fatal.
- All datetimes ISO 8601 with timezone (Europe/London).

### `iar.booking_request` (personal → frontdesk)

```json
{
  "patient_ref": "P-1042",
  "request_kind": "new | rebook | cancel",
  "existing_booking_ref": null,
  "symptoms_text": "persistent cough for 3 weeks, worse at night",
  "patient_context": {
    "age_band": "60-69",
    "vulnerability_flags": ["copd"],
    "days_already_waited": 4
  },
  "preferences": {
    "earliest": "2026-06-15T08:00:00+01:00",
    "latest": "2026-06-19T18:00:00+01:00",
    "time_of_day": ["morning"],
    "max_travel_minutes": 30,
    "home_postcode_district": "UB8"
  }
}
```

### `iar.priority_assessment` (research → frontdesk)

```json
{
  "request_ref": "REQ-20260612-031",
  "score": 78,
  "band": "urgent",
  "components": {
    "clinical_urgency": 0.82,
    "wait_time": 0.40,
    "vulnerability": 0.90,
    "access_burden": 0.35
  },
  "rationale": "Worsening respiratory symptoms in a COPD patient over 60; needs review within 48h.",
  "escalate": false,
  "escalation_target": null,
  "alternatives": [
    { "service": "pharmacy_first", "eligible": false, "reason": "outside PF clinical pathways" }
  ]
}
```

If `escalate: true`, `escalation_target` is `"111"` or `"999"` and the
frontdesk-agent MUST NOT book — it relays the escalation to the personal agent.

### `iar.slot_offer` (frontdesk → personal)

```json
{
  "request_ref": "REQ-20260612-031",
  "offers": [
    {
      "slot_ref": "SLT-20260613-0920",
      "start": "2026-06-13T09:20:00+01:00",
      "end": "2026-06-13T09:40:00+01:00",
      "clinician": "Dr Osei",
      "location": "Hillingdon Road Surgery",
      "from_reserved_pool": true
    }
  ],
  "policy_note": "Offered from urgent reserve (priority band: urgent).",
  "expires": "2026-06-12T18:00:00+01:00"
}
```

### `iar.booking_confirmation` (frontdesk → personal)

```json
{
  "booking_ref": "BKG-20260612-118",
  "slot_ref": "SLT-20260613-0920",
  "patient_ref": "P-1042",
  "status": "confirmed | cancelled | rebooked",
  "start": "2026-06-13T09:20:00+01:00",
  "end": "2026-06-13T09:40:00+01:00",
  "location": "Hillingdon Road Surgery",
  "clinician": "Dr Osei",
  "calendar_hint": { "title": "GP appointment — Dr Osei", "reminder_minutes": 120 }
}
```

On receipt with `status: confirmed`, the personal-agent writes the Google
Calendar event using `calendar_hint`.

### `iar.swap_proposal` (frontdesk → candidate's personal agent) — OPTIONAL

```json
{
  "proposal_ref": "SWP-20260612-007",
  "current_booking": { "slot_ref": "SLT-20260613-0920", "start": "2026-06-13T09:20:00+01:00" },
  "proposed_slot": { "slot_ref": "SLT-20260616-1520", "start": "2026-06-16T15:20:00+01:00", "end": "2026-06-16T15:40:00+01:00", "clinician": "Dr Osei", "location": "Hillingdon Road Surgery" },
  "reason": "An urgent case needs an earlier appointment.",
  "incentive": "priority_boost_next_booking",
  "respond_by": "2026-06-12T16:30:00+01:00"
}
```

### `iar.swap_response` (personal → frontdesk) — OPTIONAL

```json
{
  "proposal_ref": "SWP-20260612-007",
  "decision": "accept | decline",
  "reason": "calendar_conflict | patient_declined | accepted"
}
```

### `iar.disruption_notice` (frontdesk → personal) — OPTIONAL

Sent proactively to every affected patient's personal agent when a disruption
cancels or moves their booking. ALWAYS accompanied by a TextPart explaining
the situation in plain English (foreign personal agents must be able to relay
it to their patient unmodified).

```json
{
  "disruption_ref": "DSR-20260613-001",
  "kind": "clinician_absence | closure | system_outage",
  "affected_booking_ref": "BKG-20260612-118",
  "status": "cancelled | moved",
  "message": "Dr Osei is unavailable on 13 June. Your 09:20 appointment is cancelled.",
  "replacement_offers": [ /* same shape as iar.slot_offer.offers, may be empty */ ],
  "apology_priority_boost": true
}
```

The personal agent: updates the calendar (delete/move the event), informs the
patient (voice + A2UI card), and replies to `replacement_offers` like a normal
slot offer. If it receives this as plain text only, it simply relays the text.

### Overflow referral (frontdesk → sibling frontdesk) — OPTIONAL

No new schema: the referring frontdesk-agent sends a standard
`iar.booking_request` to the sibling practice's frontdesk agent, with one
optional extension field in `payload`:

```json
"referral": {
  "origin_practice_id": "hillingdon-road",
  "reason": "urgent_capacity_exhausted",
  "priority_assessment": { /* the full iar.priority_assessment we computed */ }
}
```

Rules: the receiving practice MAY trust the included assessment from a
directory-listed sibling or re-score independently (default: re-score; trust
only same-directory peers). Resulting offers are relayed back to the patient's
personal agent by the ORIGIN practice — the patient keeps one point of
contact. A foreign frontdesk agent that ignores `referral` still sees a valid
booking request, so the overflow path interoperates by construction.

## Priority scoring (research-agent)

```
score_0_100 = 100 * (0.50*clinical_urgency + 0.20*wait_time
                    + 0.15*vulnerability + 0.15*access_burden)
```

- `clinical_urgency` ∈ [0,1]: LLM maps symptoms onto a FIXED rubric in
  `agents/research/rubric.py` (red-flag=1.0, worsening-acute=0.8,
  stable-acute=0.6, chronic-review=0.4, routine=0.25, admin=0.1). The LLM picks
  a rubric row and justifies it; it does NOT freestyle a number.
- `wait_time`: min(days_already_waited / 14, 1)
- `vulnerability`: 0.9 if any flag (chronic condition, age 70+, safeguarding),
  0.3 default
- `access_burden`: travel minutes / 60, capped at 1
- Bands: emergency ≥ 90 (ALWAYS escalate, never book), urgent ≥ 70,
  soon ≥ 50, routine ≥ 25, admin < 25
- NEVER trust an urgency value supplied by the requesting agent. Symptoms in,
  score out, computed here only.
- Every assessment includes a one-line plain-English `rationale`.

## Locked-slot policy (frontdesk-agent)

- Rolling 2-day window: the LAST 20% of slots per day are `reserved`.
- `reserved` slots are only offered to bands `urgent`/`emergency`(pre-escalation
  never books) — practically: `urgent`.
- Decay rule: at T-24h before slot start, unconsumed reserved slots unlock and
  are offered to the top of the routine waitlist (highest score first).
- If no priority assessment is available (foreign research agent returned
  free text or nothing), default the request to `routine` and serve normally
  from the unreserved pool. Never block a booking because scoring failed.

## Swap protocol state machine (frontdesk-agent)

```
URGENT_UNPLACEABLE
  → ask research-agent: rank_swap_candidates (exclude vulnerable, exclude same-day)
  → for candidate in ranked[:3]:
        discover candidate.personal_agent card (discovery.py)
          → supports_swap: send iar.swap_proposal (A2A, task: input-required)
          → A2A but no swap skill: send plain-text proposal, parse reply with LLM
          → no A2A endpoint at all: SMS/email with .ics + accept link
        wait ≤ 2h (demo: 60s)  → accept: ATOMIC_SWAP → confirm both parties → done
                               → decline/timeout: next candidate
  → all declined: OVERFLOW (below) → still nothing: offer next reserved slot OR
    best regular slot + monitor cancellations
```

Consent is absolute: a swap NEVER happens without an explicit accept. Vulnerable
patients are never displacement candidates. Cap = 3 proposals per urgent case.
Every state change emits an `iar_timeline` AG-UI event.

## Overflow routing (frontdesk-agent, OPTIONAL)

Triggered only for `urgent` cases after swaps are exhausted:

1. Read `data/practice_directory.json`, pick sibling practices by distance to
   the patient's postcode district (max 2 candidates).
2. Discover each sibling's Agent Card; send a standard `iar.booking_request`
   with the `referral` extension (see schema). Sequential, not parallel —
   30s timeout each.
3. Sibling offers a slot → relay the offer to the patient's personal agent AS
   the origin practice ("Hillingdon Road can't see you today, but Uxbridge
   Health Centre can at 16:40 — shall I book it?"). Patient accepts → origin
   forwards the booking to the sibling and relays the confirmation.
4. No sibling capacity → fall back to the regular ladder (reserved slot /
   best regular slot + monitor cancellations).

The patient always has ONE conversation with ONE agent; cross-practice
plumbing is invisible to them.

## Disruption mode (frontdesk-agent, OPTIONAL — flagship demo)

Trigger: an operator action in the demo UI ("Mark Dr Osei absent on <date>")
or an `iar.disruption` admin message. The cascade, in strict order:

```
DISRUPTION(clinician, date)
  1. FREEZE: mark all affected slots invalid; collect affected bookings (N)
  2. RE-SCORE: batch the N bookings to research-agent (assess_priority);
     foreign/unavailable research agent → preserve each booking's last known
     band, default routine
  3. ALLOCATE remaining same-week capacity in descending priority:
       - emergency: never rebook — escalate via personal agent (111/999 path)
       - urgent: same/next-day slots first; if none → swap protocol → overflow
       - soon/routine: best available offers, reserved pool excluded
       - admin: convert to telephone/econsult offer where possible
  4. NOTIFY every affected patient's personal agent with iar.disruption_notice
     (+ TextPart), including replacement_offers from step 3 and
     apology_priority_boost: true
  5. RECONCILE: as accepts/declines stream back, reallocate declined offers to
     the next patient down; emit iar_timeline events throughout
```

Rules: notifications go out within one cascade pass (no patient learns at the
door); no patient is left without either an offer, a waitlist position, or an
escalation; the cascade is idempotent (re-running it must not double-book or
double-notify — key every action by disruption_ref + booking_ref). Demo target:
N = 14 bookings, cascade visibly completing on the timeline in under a minute.

## Degradation ladder (memorise this)

| Failure | Behaviour |
|---|---|
| Peer Agent Card unfetchable | Treat peer as text-only and proceed (discovery is never fatal) |
| Research agent down/unintelligible | Default band `routine`, proceed with booking flow, note "priority unscored" in text |
| Counterpart personal agent doesn't understand swap proposal | Plain-text proposal first; still unintelligible → treat as decline, fall back to SMS/email + .ics |
| Counterpart personal agent doesn't understand disruption notice | Send plain-text-only notice; no reply needed — the information still reaches the patient |
| Sibling practice agent down/refuses referral | Skip to next sibling, then regular ladder; never strand the urgent case |
| Counterpart frontdesk agent ignores our DataParts | Our personal agent negotiates in plain text (it must be able to run the WHOLE flow text-only) |
| Calendar API unavailable | Skip conflict check, still confirm, attach .ics in chat |
| ElevenLabs unavailable | Text-only UI, zero functional loss |

The text-only path is not a fallback afterthought — it is the path the graders
will most likely exercise. Test it first.

## Edge layer specifics

### Voice (ElevenLabs) — frontend/personal-agent edge only
- STT: Scribe v2 (`model_id: scribe_v2`), en-GB primary.
- TTS: streaming endpoint, start playback on first chunk. While waiting on the
  A2A chain, speak a short status filler ("Let me check with the surgery").
- Voice never replaces UI: speak the slot offers AND render the A2UI card;
  accept answers by tap or voice ("the Monday one").

### Calendar (Google Calendar API) — personal-agent only
- Read: poll/subscribe for events conflicting with known bookings → trigger
  proactive rebooking (this IS the DNA-prevention mechanic — demo it).
- Read: auto-check inbound swap proposals; auto-decline on hard conflict with
  `reason: calendar_conflict` before bothering the patient.
- Write: on `booking_confirmation`, create event from `calendar_hint`.
- Fallback: `.ics` file generation for the no-agent SMS/email path.

### Generative UI
- AG-UI (CopilotKit) is the runtime event channel between personal-agent and
  the Next.js app: streaming status ("contacting surgery…", "checking
  urgency…" — judges should SEE the agent chain working).
- The `iar_timeline` negotiation panel (see "AG-UI negotiation timeline") is a
  first-class deliverable, not polish — it is also our debugging tool.
- A2UI JSON cards for: slot picker (offers list → tap to book), swap consent
  (current vs proposed, accept/decline), escalation notice (call 111 button),
  disruption notice (cancelled booking + replacement offers in one card).
- Demo operator controls (frontend, not A2A): "mark clinician absent" button
  to trigger disruption mode live.

## Repo structure

```
iar/
├── CLAUDE.md                  # this file
├── agents/
│   ├── common/                # envelope helpers, schema models (pydantic), llm.py, a2a utils,
│   │                          # discovery.py (Agent Card fetch + PeerProfile + dialect choice)
│   ├── personal/              # agent_card.json, server.py, executor.py, calendar_client.py,
│   │                          # inbound.py (swap proposals + disruption notices)
│   ├── frontdesk/             # agent_card.json, server.py, executor.py, ledger.py (SQLite),
│   │                          # swap.py, overflow.py, disruption.py (cascade), notify.py (SMS/email/.ics)
│   └── research/              # agent_card.json, server.py, executor.py, rubric.py, services_directory.py
├── frontend/                  # Next.js + CopilotKit + A2UI renderer + ElevenLabs voice + timeline panel
├── data/                      # seed slots, mock patients, mock NHS services directory,
│                              # practice_directory.json (2-3 mock practices: id, name, postcode, agent URL)
├── tests/
│   ├── test_interop_textonly.py   # FULL flow with plain-text-only counterpart agents
│   ├── test_discovery.py          # card fetch, PeerProfile, dialect fallback, hostile cards
│   ├── test_schemas.py
│   ├── test_scoring.py
│   ├── test_swap.py
│   ├── test_disruption.py         # cascade ordering, idempotency, no patient left unhandled
│   ├── test_overflow.py           # referral relay, sibling-down fallback
│   └── test_degradation.py
└── scripts/run_all.sh         # start research + personal + N frontdesk instances + frontend
```

## Working agreements for Claude Code

- Pydantic models in `agents/common/schemas.py` are the single source of truth
  for every `iar.*` payload. Generate/validate JSON only through them.
- Each agent is an independent A2A server, started independently, sharing code
  ONLY via `agents/common`. No agent imports another agent's package.
- No hardcoded URLs outside `.env` (`PERSONAL_AGENT_URL`, etc.). Agents
  discover each other's capabilities by FETCHING the Agent Card, not by
  assuming.
- Before claiming an agent works: run it, hit it with `a2a-inspector`, and run
  `tests/test_interop_textonly.py`. Text-only interop is the release gate.
- Healthcare guardrails are non-negotiable: emergency band always escalates and
  never books; swap requires consent; vulnerable patients never displaced;
  every score ships with a rationale.
- Mock data lives in `data/`; never call real NHS systems. Patient data is
  synthetic; still treat it as if real (no logging of symptoms at INFO level).
- Disruption cascade and swaps must be idempotent: every outbound action is
  keyed (disruption_ref/proposal_ref + booking_ref) and safely re-runnable.
- Demo arc (build in this order, each act must work before starting the next):
  Act 1 — single voice booking with calendar write;
  Act 2 — urgent case → swap negotiation visible on the timeline;
  Act 3 — clinician absence → disruption cascade with overflow to a second
  practice. Same three agents throughout; no act may break a previous one.
- Keep diffs small and runnable. Prefer boring, spec-faithful code over clever
  abstractions — the graders run a held-out harness, not our demo.

## Build & test discipline (project addendum)

These two rules are project-mandated and apply on top of everything above. They
strengthen the gated build order; they never override the interop or safety
guardrails.

### A. Build and test each agent in isolation before integrating

Develop the research, frontdesk, and personal agents ONE AT A TIME as
independent A2A servers. Each agent must pass:

- its own unit tests, AND
- a standalone server test — `a2a-inspector` clean, plus a per-agent harness
  that mocks/stubs its peers (e.g. a fake research agent returning a canned
  `iar.priority_assessment`; a fake personal agent that accepts/declines),

BEFORE any two agents are wired together. Only once all three are individually
green do you compose the canonical chain (personal → frontdesk → research) and
run the integration suite (`tests/test_interop_textonly.py` and friends). Never
debug the full chain before the parts are individually green.

### B. Build ElevenLabs STT and TTS as separate, independently testable elements

Implement Scribe v2 STT and streaming TTS as standalone modules (e.g.
`frontend/lib/voice/stt.*` and `frontend/lib/voice/tts.*`) with their own
isolated test harness / sandbox page, fully decoupled from the booking / A2A
flow. Validate each on its own first (record → transcribe; text →
stream-and-play); only wire them into the edge layer afterwards. The whole
system must always run text-only with voice disabled (zero functional loss, per
the Degradation ladder), so voice integration is always an additive, later
step — built and tested last, exactly like the rest of the edge layer.
