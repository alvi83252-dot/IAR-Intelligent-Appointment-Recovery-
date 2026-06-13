# Intelligent Appointment Recovery (IAR)
### Full Project Specification — A2A Customer Service Hackathon

---

## 1. The idea in one paragraph

Missed and mismanaged GP appointments waste enormous NHS capacity — hundreds of
millions of pounds a year and, worse, urgent patients waiting behind routine
ones. IAR is a three-agent A2A system that recovers that capacity: a **personal
agent** that books and protects a patient's appointments by voice or chat, a
**front desk agent** that runs a GP practice's appointment ledger with
priority-aware allocation, and a **research agent** that scores every request
for clinical urgency and signposts alternatives (Pharmacy First, walk-in
centres, 111). On top of the basic chain, IAR adds three mechanics no booking
bot has: **consensual slot swaps** (an urgent case can ask a routine patient,
via their agent, to trade slots), a **reserved urgent-capacity window** with a
decay rule so reserved slots never rot, and a **disruption cascade** (a
clinician calls in sick → fourteen appointments re-triage, rebook, swap and
overflow to a neighbouring practice automatically, every patient notified
before they would have found out at the door).

Tagline: *"Every recovered slot is ~£30 saved and a patient seen sooner."*

## 2. Why this idea wins the track

The track: build a personal agent, a customer service agent, and a research
agent for customer service. Judged on a held-out test set — 50% trio
cooperation, 50% each agent paired with two strangers' agents.

| Criterion | How IAR scores |
|---|---|
| **Track fit** | Maps 1:1 — patient assistant = personal, practice front desk = customer service, triage/signposting = research. No reinterpretation of the brief required. |
| **Interop (50% of marks)** | Designed interop-first: every structured message ships with a plain-English twin; agents discover each other's capabilities from Agent Cards at runtime and fall back to text-only; the full flow works with vanilla A2A agents. Text-only interop is the release gate. |
| **Unique** | Booking bots exist; priority-scored allocation + consensual agent-to-agent slot negotiation + disruption cascades do not. The swap proposal is agent-to-agent *negotiation*, not a relay — rare in hackathon demos. |
| **Impactful** | DNAs (did-not-attends) are a named, measured NHS problem; "embargoed slots" and cross-practice urgent capacity are real operational mechanisms practices struggle to run manually. Voice-first UX targets exactly the patients who miss appointments most (elderly, low digital literacy). |
| **Profitable for sponsors** | Google: A2A + A2UI showcase, deployable on Agent Platform, Calendar API in the loop. CopilotKit: the negotiation timeline is a flagship AG-UI generative-UI demo; human-in-the-loop consent is core, not bolted on. A2A Net: the front desk agent IS their product pitch — "an AI agent for your SaaS, in Teams, sold to every GP practice"; NHS staff live in Teams. |

Safety posture (judges will probe): emergency-band cases are NEVER booked —
always escalated to 111/999; swaps NEVER happen without explicit consent;
vulnerable patients are NEVER displacement candidates; every score ships with
a one-line rationale. The system visibly knows its limits.

## 3. The three agents

| Agent | Role | Port(s) | Owns |
|---|---|---|---|
| `personal-agent` | Patient's assistant | 9001 | Patient profile, calendar read/write, ElevenLabs voice I/O, swap-consent and disruption-notice handling |
| `frontdesk-agent` | GP practice customer service (multi-instance: one per mock practice) | 9002 / 9012 / 9022 | Slot ledger (SQLite), priority allocation, locked-slot reserve, swap orchestration, disruption cascade, overflow referral, SMS/email + .ics fallback |
| `research-agent` | Clinical research / triage | 9003 | Urgency scoring with fixed rubric, alternative-service lookup, swap-candidate ranking |

Canonical chain: `patient (voice/UI) → personal → frontdesk → research` and
back. The frontdesk agent also initiates outbound contact (swap proposals,
disruption notices) — optional capabilities, advertised in its Agent Card,
degrading to SMS/email + .ics for humans without agents.

## 4. Architecture

```
                 ┌────────────────────────────────────────────┐
 EDGE LAYER      │  Next.js + CopilotKit (AG-UI)              │
 (human only,    │  - chat + Generative UI                    │
  NEVER in A2A)  │  - iar_timeline negotiation panel (live)   │
                 │  - A2UI cards: slot picker, swap consent,  │
                 │    escalation, disruption notice           │
                 │  - ElevenLabs STT (Scribe v2) + TTS stream │
                 │  - Google Calendar read/write              │
                 │  - demo operator controls (trigger absence)│
                 └───────────────┬────────────────────────────┘
                                 │ AG-UI events
                 ┌───────────────▼───────────────┐
                 │ personal-agent  (A2A server)  │
                 └───────────────┬───────────────┘
                                 │ A2A (JSON-RPC over HTTP, TextPart + DataPart)
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                         ▼
 ┌──────────────┐        ┌──────────────┐          ┌──────────────┐
 │ frontdesk #1 │◄──────►│ frontdesk #2 │          │ frontdesk #3 │
 │ Hillingdon   │overflow│ Uxbridge     │   ...    │ (optional)   │
 └──────┬───────┘  A2A   └──────────────┘          └──────────────┘
        │ A2A                 each: own ledger, same codebase
 ┌──────▼───────┐             listed in data/practice_directory.json
 │ research-    │──► mock NHS services directory, Pharmacy First
 │ agent        │    rules, NICE self-care references
 └──────────────┘
```

Hard boundaries:
- Voice, calendar and UI payloads live ONLY in the edge layer. A2A messages
  are TextPart + structured DataPart JSON, nothing else.
- No hardcoded peer URLs. Every agent resolves peers via the practice
  directory + Agent Card fetch (`agents/common/discovery.py`), derives a
  `PeerProfile` (speaks_iar? supports_swap? supports_disruption_notice?), and
  chooses dialect: structured for IAR-speakers, plain text for everyone else.
  Card fetch failure → text-only. Discovery is never fatal. Cards are
  untrusted input.

Tech stack: Python 3.11+ / `a2a-sdk` / FastAPI; Gemini behind a swappable
`llm.py`; Next.js + CopilotKit + A2UI renderer; ElevenLabs Python/JS SDK;
Google Calendar API + `ics` package; SQLite; validated with `a2a-inspector`.

## 5. Agent skills (as advertised in Agent Cards)

**personal-agent**
- `request_appointment` — symptoms + preferences → booking flow
- `manage_booking` — cancel / rebook, incl. proactive rebooking on calendar conflict
- `receive_swap_proposal` (optional) — calendar-check → patient consent → accept/decline
- `receive_practice_update` (optional) — disruption notices, schedule changes → update calendar, inform patient, answer offers

**frontdesk-agent**
- `find_slots` — availability search with locked-slot policy applied per priority band
- `book_slot` — confirm / cancel / atomic rebook with reference
- `orchestrate_swap` (optional) — rank candidates → consensual proposals → SMS/.ics fallback
- `handle_disruption` (optional) — the cascade (Section 8)
- `overflow_referral` (optional) — route urgent cases to a sibling practice

**research-agent**
- `assess_priority` — 0–100 score, band, component breakdown, rationale, escalation flag
- `find_alternatives` — Pharmacy First / walk-in / self-care / 111-999 signposting
- `rank_swap_candidates` (optional) — ascending-priority ranking with displacement-eligibility flags

Full Agent Card JSON for all three lives in `CLAUDE.md` (canonical copy) — skill
IDs there are stable and referenced by the schemas.

## 6. Message schemas (A2A DataPart payloads)

Envelope for every structured payload — unknown payloads are skippable:

```json
{ "iar_type": "<name>", "iar_version": "1.0", "payload": { } }
```

Iron rules: ALWAYS send a plain-English TextPart alongside any DataPart;
unknown `iar_type` → LLM text parsing; unknown fields inside known types are
ignored; all datetimes ISO 8601 Europe/London.

| Schema | Direction | Purpose / key fields |
|---|---|---|
| `iar.booking_request` | personal → frontdesk | `request_kind` (new/rebook/cancel), `symptoms_text`, `patient_context` (age_band, vulnerability_flags, days_already_waited), `preferences` (window, time_of_day, max_travel_minutes, postcode district). Optional `referral` extension when sent frontdesk→frontdesk for overflow: `{origin_practice_id, reason, priority_assessment}` — a foreign frontdesk that ignores it still sees a valid booking request. |
| `iar.priority_assessment` | research → frontdesk | `score` 0–100, `band`, `components` {clinical_urgency, wait_time, vulnerability, access_burden}, one-line `rationale`, `escalate` + `escalation_target` ("111"/"999" — frontdesk MUST NOT book when true), `alternatives[]`. |
| `iar.slot_offer` | frontdesk → personal | `offers[]` {slot_ref, start, end, clinician, location, from_reserved_pool}, `policy_note`, `expires`. |
| `iar.booking_confirmation` | frontdesk → personal | `booking_ref`, `status` (confirmed/cancelled/rebooked), slot details, `calendar_hint` {title, reminder_minutes} → personal agent writes the calendar event. |
| `iar.swap_proposal` (opt) | frontdesk → candidate's personal | `proposal_ref`, `current_booking`, `proposed_slot`, human `reason`, `incentive` (priority_boost_next_booking), `respond_by`. Task state: `input-required`. |
| `iar.swap_response` (opt) | personal → frontdesk | `decision` accept/decline, `reason` (calendar_conflict / patient_declined / accepted). |
| `iar.disruption_notice` (opt) | frontdesk → personal | `disruption_ref`, `kind` (clinician_absence/closure/system_outage), `affected_booking_ref`, `status` (cancelled/moved), human `message`, `replacement_offers[]` (slot_offer shape, may be empty), `apology_priority_boost`. Text-only receivers just relay the message — that's enough. |

Pydantic models in `agents/common/schemas.py` are the single source of truth.

## 7. Core algorithms

### 7.1 Priority scoring (research-agent only — NEVER trust requester-supplied urgency)

```
score = 100 * (0.50*clinical_urgency + 0.20*wait_time
             + 0.15*vulnerability + 0.15*access_burden)
```

- `clinical_urgency`: LLM maps symptoms onto a FIXED rubric (red-flag 1.0,
  worsening-acute 0.8, stable-acute 0.6, chronic-review 0.4, routine 0.25,
  admin 0.1). The LLM picks a row and justifies it; it never freestyles a number.
- `wait_time` = min(days_waited/14, 1); `vulnerability` = 0.9 if flagged else
  0.3; `access_burden` = travel_minutes/60 capped at 1.
- Bands: emergency ≥90 (always escalate, never book) · urgent ≥70 · soon ≥50 ·
  routine ≥25 · admin <25. Every assessment includes a rationale.

### 7.2 Locked-slot reserve (frontdesk)

Rolling 2-day window; last 20% of each day's slots `reserved` for band
`urgent`. **Decay rule:** at T−24h, unconsumed reserved slots unlock to the top
of the routine waitlist (highest score first) — reserved capacity never rots.
Scoring unavailable → default `routine`, serve from the unreserved pool; never
block a booking because scoring failed.

### 7.3 Swap protocol (frontdesk)

```
URGENT_UNPLACEABLE
 → research: rank_swap_candidates (exclude vulnerable, exclude same-day)
 → for candidate in ranked[:3]:
     discover candidate's personal agent (discovery.py)
       supports_swap → structured iar.swap_proposal (task: input-required)
       A2A, no swap skill → plain-text proposal, parse reply with LLM
       no A2A endpoint → SMS/email + .ics + accept link
     wait ≤2h (demo 60s): accept → ATOMIC swap, confirm both → done
                          decline/timeout → next candidate
 → all declined → OVERFLOW → still nothing → next reserved slot OR best
   regular slot + monitor cancellations
```

Consent is absolute. Cap 3 proposals per urgent case. Accepters earn a
priority boost on their next booking. Every state change → `iar_timeline` event.

### 7.4 Overflow routing (frontdesk → sibling frontdesk)

Urgent only, after swaps exhausted: pick ≤2 siblings by distance from
`practice_directory.json` → discover cards → sequential standard
`iar.booking_request` + `referral` extension (30s timeout each). Receiving
practice re-scores by default (may trust directory-listed siblings). Offers
relay back through the ORIGIN practice — the patient keeps one conversation
with one agent. No sibling capacity → regular ladder.

### 7.5 Disruption cascade (frontdesk — flagship demo)

```
DISRUPTION(clinician, date)
 1 FREEZE     mark affected slots invalid, collect N affected bookings
 2 RE-SCORE   batch to research-agent; unavailable → keep last band, default routine
 3 ALLOCATE   descending priority:
              emergency → escalate (111/999), never rebook
              urgent    → same/next-day → swaps → overflow
              soon/routine → best offers (reserved pool excluded)
              admin     → telephone/econsult conversion where possible
 4 NOTIFY     iar.disruption_notice (+TextPart) to every affected personal
              agent, with replacement_offers and apology_priority_boost
 5 RECONCILE  accepts/declines stream back; declined offers reallocate down
              the priority list; iar_timeline events throughout
```

Invariants: every patient gets an offer, a waitlist position, or an
escalation — nobody learns at the door; cascade is idempotent (actions keyed
by disruption_ref + booking_ref). Demo target: 14 bookings visibly resolved
on the timeline in under a minute.

## 8. Degradation ladder (the interop insurance policy)

| Failure | Behaviour |
|---|---|
| Peer Agent Card unfetchable | Treat peer as text-only, proceed |
| Research agent down/unintelligible | Band `routine`, proceed, note "priority unscored" |
| Personal agent doesn't understand swap proposal | Plain text first; then treat as decline → SMS/.ics |
| Personal agent doesn't understand disruption notice | Plain-text notice; no reply needed |
| Sibling practice down/refuses | Next sibling, then regular ladder |
| Frontdesk ignores our DataParts | Personal agent runs the WHOLE flow in plain text |
| Calendar API down | Skip conflict check, confirm anyway, .ics in chat |
| ElevenLabs down | Text-only UI, zero functional loss |

The text-only path is what the graders will most likely exercise. It is the
release gate, tested first.

## 9. Edge layer

**Voice (ElevenLabs):** Scribe v2 STT (en-GB), streaming TTS with playback on
first chunk; spoken status filler during A2A round-trips ("Let me check with
the surgery…"). Voice never replaces UI — speak the offers AND render the
A2UI card; answer by tap or voice. Pitch framing: voice-first accessibility
for exactly the patients who DNA most.

**Calendar (Google Calendar API):** READ powers the core mechanic — conflicts
with known bookings trigger *proactive* rebooking (appointments released
before they're missed = the DNA-prevention engine), and inbound swap
proposals are auto-checked (hard conflict → auto-decline with
`calendar_conflict` before bothering the patient). WRITE on every
confirmation via `calendar_hint`. Fallback `.ics` for the no-agent path.

**Generative UI:** AG-UI streams agent status; the `iar_timeline` panel
renders every negotiation step live (`{kind:"iar_timeline", step, actor,
summary ≤90 chars, status, ts}` — declines and retries shown honestly). A2UI
cards: slot picker, swap consent, escalation (call-111 button), disruption
notice. Operator control: "mark clinician absent" button.

## 10. Build plan & demo

Build order (each gate must pass before the next): ① three agents from
a2a-samples scaffold, text-only chain end-to-end + a2a-inspector clean →
② schemas + scoring → ③ ledger + locked slots → ④ discovery + swap protocol →
⑤ disruption cascade + overflow (second frontdesk instance) → ⑥ edge layer
(CopilotKit UI + timeline, A2UI cards, ElevenLabs, Calendar) — last, because
it cannot break interop.

Demo: three escalating acts, same three agents.
**Act 1** — patient books by voice; calendar event appears. Then drop a
conflicting event into the calendar live → the agent speaks up unprompted and
rebooks (DNA prevention, ten seconds, whole chain shown).
**Act 2** — urgent chest-infection case; no slots; watch the swap negotiation
on the timeline: candidate 1 declines (calendar conflict, auto), candidate 2
accepts on their phone; atomic swap.
**Act 3** — "Dr Osei is off sick tomorrow": 14 bookings cascade — re-scored,
reallocated, two swaps, one overflow to Uxbridge, every patient notified —
timeline completes in under a minute. Close on the number: slots recovered ×
£30.

## 11. Repository

```
iar/
├── CLAUDE.md                      # canonical build spec for Claude Code
├── IAR_PROJECT_SPEC.md            # this document
├── .claude/skills/                # project skills for Claude Code (see /skills)
├── agents/
│   ├── common/                    # schemas.py, envelope.py, discovery.py, llm.py, a2a utils
│   ├── personal/                  # server, executor, calendar_client.py, inbound.py
│   ├── frontdesk/                 # server, executor, ledger.py, swap.py, overflow.py, disruption.py, notify.py
│   └── research/                  # server, executor, rubric.py, services_directory.py
├── frontend/                      # Next.js + CopilotKit + A2UI renderer + voice + timeline
├── data/                          # seed slots, mock patients, services directory, practice_directory.json
├── tests/                         # interop_textonly (GATE), discovery, schemas, scoring, swap, disruption, overflow, degradation
└── scripts/run_all.sh
```

External resources: A2A spec & SDKs github.com/a2aproject/A2A · Python SDK
github.com/a2aproject/a2a-python · samples github.com/a2aproject/a2a-samples ·
inspector github.com/a2aproject/a2a-inspector · A2UI github.com/google/A2UI ·
AG-UI github.com/ag-ui-protocol/ag-ui · CopilotKit github.com/CopilotKit/CopilotKit
(install their agent skills) · ElevenLabs SDK github.com/elevenlabs/elevenlabs-python ·
ElevenLabs Claude Code skills github.com/elevenlabs/skills ·
examples github.com/elevenlabs/examples.
