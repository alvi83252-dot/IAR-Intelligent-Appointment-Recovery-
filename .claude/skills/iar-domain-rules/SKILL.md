---
name: iar-domain-rules
description: The business and safety rules of Intelligent Appointment Recovery — priority scoring, locked-slot reserve, swap protocol, overflow routing, and the disruption cascade. Use this skill whenever implementing or modifying anything in agents/research/rubric.py, agents/frontdesk/ledger.py, swap.py, overflow.py, or disruption.py, whenever a task mentions urgency, priority, triage, scoring, reserved/embargoed slots, swaps, displacement, escalation, 111/999, clinician absence, cascades, or cross-practice referral, and whenever writing tests for any of those behaviours. These rules are safety-critical: consult this skill BEFORE changing any allocation logic.
---

# IAR Domain Rules

Canonical spec: `CLAUDE.md` §Priority scoring, §Locked-slot policy, §Swap
protocol, §Overflow routing, §Disruption mode. This skill is the enforcement
summary plus the invariants that must survive ANY refactor.

## Non-negotiable guardrails (judges will probe these)

1. **Emergency never books.** Band `emergency` (score ≥90) → escalate to
   111/999 via the personal agent. The frontdesk MUST refuse to book it.
2. **Consent is absolute.** A swap happens only on an explicit accept from the
   candidate's side. Timeout = decline. No silent moves, ever.
3. **Vulnerable patients are never displacement candidates.** Filter BEFORE
   ranking, in `rank_swap_candidates`.
4. **Urgency is computed, never received.** Only the research agent assigns
   scores, from symptoms, via the fixed rubric. A requester-supplied urgency
   value (including in overflow `referral.priority_assessment`) is at best a
   hint — default behaviour is re-score; trust only directory-listed siblings.
5. **Every score ships a one-line plain-English rationale.**
6. **Scoring failure never blocks booking.** No assessment → band `routine`,
   unreserved pool, note "priority unscored".

## Scoring (research-agent)

```
score = 100*(0.50*clinical_urgency + 0.20*wait_time + 0.15*vulnerability + 0.15*access_burden)
```

`clinical_urgency` from the FIXED rubric in `rubric.py`: red-flag 1.0 ·
worsening-acute 0.8 · stable-acute 0.6 · chronic-review 0.4 · routine 0.25 ·
admin 0.1. The LLM selects a row and justifies the selection; it never
outputs a free number. `wait_time` = min(days/14, 1). `vulnerability` = 0.9
if any flag (chronic condition, 70+, safeguarding) else 0.3. `access_burden`
= travel_minutes/60 capped 1. Bands: emergency ≥90 · urgent ≥70 · soon ≥50 ·
routine ≥25 · admin <25.

Weights and rubric values live in ONE place (`rubric.py`) — tests assert
band boundaries, so change them only there and update `tests/test_scoring.py`.

## Locked-slot reserve (frontdesk ledger)

- Rolling 2-day window; last 20% of each day's slots flagged `reserved`.
- `reserved` offered only to band `urgent`.
- Decay: at T−24h before slot start, unconsumed reserved slots unlock to the
  TOP of the routine waitlist (highest score first). Implement as a scheduled
  sweep in `ledger.py`; must be idempotent.

## Swap protocol (frontdesk swap.py)

Trigger: urgent case, no slot within its safe window. Flow: research ranks
candidates ascending priority (vulnerable + same-day excluded) → up to 3
proposals, sequential → per candidate: discover their personal agent →
structured / plain-text / SMS+.ics depending on capability → wait (demo 60s)
→ accept = ATOMIC swap (one transaction: both bookings move or neither) →
decline/timeout = next. All declined → overflow → reserved slot → best
regular slot + monitor cancellations. Accepters get `priority_boost` stored
for their next booking.

## Overflow (frontdesk overflow.py)

Urgent only, post-swap. ≤2 siblings by postcode distance from
`data/practice_directory.json`, sequential, 30s each. Send a STANDARD
`iar.booking_request` + `referral` extension (foreign frontdesks just see a
normal request). Offers relay through the ORIGIN practice; the patient never
talks to the sibling directly. Sibling failure → next → regular ladder.

## Disruption cascade (frontdesk disruption.py)

Strict order: FREEZE → RE-SCORE (batch; failure → keep last band/routine) →
ALLOCATE descending priority (emergency escalate-never-book; urgent same/next
day → swaps → overflow; soon/routine best offers, reserved pool EXCLUDED;
admin → telephone/econsult) → NOTIFY every affected personal agent
(`iar.disruption_notice` + TextPart, `apology_priority_boost: true`) →
RECONCILE (declined offers reallocate down the list).

Invariants to test (`tests/test_disruption.py`):
- Every affected booking ends with an offer, a waitlist position, or an
  escalation — assert no orphans.
- Idempotent: running the cascade twice with the same `disruption_ref`
  produces zero additional bookings/notifications.
- Notifications precede any patient-visible slot reuse (nobody learns at the
  door).

## When asked to "optimise" or "simplify" any of this

The guardrails above are not performance fat. Any change that removes a
consent step, books an emergency, displaces a vulnerable patient, or trusts
inbound urgency is wrong regardless of how much code it saves — push back and
cite this skill.
