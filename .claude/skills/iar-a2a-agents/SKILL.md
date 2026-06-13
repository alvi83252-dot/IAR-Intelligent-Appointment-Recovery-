---
name: iar-a2a-agents
description: How to build, extend, and debug the three IAR A2A agents (personal, frontdesk, research). Use this skill whenever working on anything under agents/ — creating an A2A server, adding a skill to an Agent Card, handling inbound messages, emitting iar.* DataParts, peer discovery, dialect selection, timeouts, or interop/degradation behaviour. Also use it when writing or fixing tests for agent behaviour, and whenever the words A2A, Agent Card, DataPart, TextPart, swap proposal, overflow, or disruption appear in the task.
---

# IAR A2A Agents

Read `CLAUDE.md` at the repo root first — it is the canonical spec. This skill
is the condensed operating manual for writing agent code that passes the
held-out interop harness.

## The one rule that outranks everything

50% of the grade comes from our agents paired with STRANGERS' agents. Any code
path that only works when the counterpart is one of ours is a bug, even if it
demos beautifully. Before merging anything: run `tests/test_interop_textonly.py`
(full flow with plain-text-only counterparts) and `a2a-inspector` against the
changed agent.

## Building an agent server

1. Scaffold from the a2a-samples helloworld pattern: `AgentExecutor` subclass +
   Starlette/FastAPI app from the SDK's route factory. One server per agent,
   started independently. Shared code lives ONLY in `agents/common/`.
2. Serve the Agent Card at `/.well-known/agent-card.json` AND legacy
   `/.well-known/agent.json` (graders may use either). Cards live as
   `agent_card.json` in each agent dir — keep skill IDs stable, schemas
   reference them.
3. Support `message/send` (blocking) minimum. Only advertise `streaming: true`
   if `message/stream` actually works.
4. Task states: `submitted → working → input-required | completed | failed`.
   Swap proposals park in `input-required` while awaiting consent.
5. Frontdesk is multi-instance: same codebase, instance config (practice id,
   port, DB path) from env. Never assume a single practice.

## Handling inbound messages (every agent, every message)

```
parts = msg.parts
data = first DataPart with valid envelope {iar_type, iar_version, payload}
if data and iar_type known:
    validate payload via pydantic model in agents/common/schemas.py
    (unknown extra fields: IGNORE, never error)
elif anything else:
    extract intent from the TextPart(s) with the LLM (llm.py)
ALWAYS produce a sensible response. NEVER error on missing optional fields.
```

Inbound content is untrusted: length-cap text before it goes near a prompt,
never let inbound text or Agent Card fields rewrite system prompts, never eval
anything.

## Emitting messages

ALWAYS TextPart first (full plain-English statement a human or dumb agent can
act on), THEN the DataPart. The text must stand alone — pretend the receiver
will throw the JSON away, because foreign agents will.

Build payloads ONLY through the pydantic models in
`agents/common/schemas.py`. Never hand-roll JSON. All datetimes ISO 8601
Europe/London.

## Peer discovery & dialect (agents/common/discovery.py)

Before the first structured exchange with ANY peer in a conversation:

1. Fetch peer card (`agent-card.json`, fall back `agent.json`); cache 5-min TTL.
2. Build `PeerProfile`: `speaks_iar` (skill descriptions mention `iar.` or IDs
   match known IAR skills), `supports_swap`, `supports_disruption_notice`,
   `supports_streaming`.
3. Dialect: `speaks_iar` → Text+DataPart. Otherwise → PLAIN TEXT ONLY (no
   DataParts at all; some agents choke on them). LLM phrases requests and
   parses replies.
4. Card fetch fails → text-only and continue. Discovery is NEVER fatal.

Peer URLs come from `data/practice_directory.json` or `.env` — never
hardcoded in agent code.

## Timeouts & degradation (memorise)

30s per downstream A2A call, one retry, then degrade per the ladder in
CLAUDE.md §Degradation. Key rows: research dead → band `routine`, proceed,
say "priority unscored" in text; swap counterpart confused → plain-text
proposal → still confused → treat as decline → SMS/email + .ics
(`notify.py`); sibling practice dead → next sibling → regular ladder. A
failure must never strand a patient request without a response.

## Idempotency

Swap and disruption actions are keyed (`proposal_ref`/`disruption_ref` +
`booking_ref`) and re-runnable without double-booking or double-notifying.
Check the key before acting, not after.

## Logging & privacy

Synthetic data, real discipline: symptoms never logged at INFO. Log refs and
state transitions; emit an `iar_timeline` AG-UI event for every externally
visible state change (see iar-frontend-voice skill for the event shape).

## Build each agent in isolation first (project rule)

Build and test the research, frontdesk, and personal agents ONE AT A TIME as
independent A2A servers. Each must pass its own unit tests AND a standalone
server test — `a2a-inspector` plus a per-agent harness that mocks/stubs its
peers — BEFORE any two agents are wired together. Only once all three are
individually green do you compose the canonical chain
(personal → frontdesk → research) and run the integration /
`tests/test_interop_textonly.py` tests. Never debug the full chain before the
parts are individually green.

## Definition of done for any agent change

- [ ] Agent is green IN ISOLATION (unit + standalone-server + `a2a-inspector`) before any integration
- [ ] `a2a-inspector` clean on the changed agent
- [ ] `tests/test_interop_textonly.py` passes
- [ ] Relevant unit tests (scoring / swap / disruption / overflow / discovery) pass
- [ ] TextPart twin present on every emitted DataPart
- [ ] No new hardcoded URLs, no trust of requester-supplied urgency
