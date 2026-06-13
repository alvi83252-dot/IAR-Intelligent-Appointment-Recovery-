# IAR A2A agents (Python)

Three Google ADK agents served over A2A, in the shape of the
[a2a-hackathon template](../../a2a-hackathon-template-main). The Next.js
`careflow` app (repo root) is the separate demo/edge layer.

```
patient → personal-agent (:9001) → frontdesk-agent (:9002) → research-agent (:9003)
                                                                  └── Redis RAG (NHS kb)
```

| Agent | Port | Role | Key tools |
|-------|------|------|-----------|
| `personal` | 9001 | Patient's assistant (chain entry) | `ask_frontdesk`, calendar conflict/write, `.ics` |
| `frontdesk` | 9002 | GP practice ("cs" role) | `find_slots`, `book_slot`, `cancel_or_rebook`, `ask_research` |
| `research` | 9003 | Triage + signposting (internal peer) | `assess_priority`, `rank_swap_candidates`, `kb_search_*`, (Linkup) |

Each agent: `agent.py` (LlmAgent + tools) · `main.py` (`to_a2a`) · `requirements.txt` ·
`Dockerfile`. Shared code in `common/` only. Every downstream call propagates the
inbound A2A **contextId** (`common/session.py`) so the chain shares one session.

## Run

```bash
cp .env.example .env          # set GOOGLE_API_KEY (AI Studio key); GEMINI_API_KEY also accepted

# Full stack incl. Redis RAG (needs Docker):
docker compose up --build

# Or local dev without Docker (Redis optional — RAG degrades gracefully):
./scripts/run_all.ps1         # Windows
./scripts/run_all.sh          # macOS/Linux/git-bash
```

Cards: `http://localhost:9001/.well-known/agent-card.json` (and :9002, :9003).

## Test

```bash
pytest tests/test_scoring.py tests/test_ledger.py -q      # pure logic, no deps/network
PYTHONPATH=agents python scripts/smoke_chain.py           # end-to-end (agents must be up)
pytest tests/test_interop_textonly.py -q                  # end-to-end (skips if agents down)
```

## Knowledge base (research RAG)

`kb/documents/*.json` (NHS signposting) is indexed into Redis at startup
(`research/ingest.py`). Bake vectors for instant startup:

```bash
PYTHONPATH=agents python agents/research/precompute_embeddings.py   # writes kb/embeddings.json
```

## Notes / divergences from the template

- **Auth:** AI Studio key by default (`GOOGLE_GENAI_USE_VERTEXAI=false`); flip to Vertex via env.
- **3 agents** (template has 2); `research` is internal to the chain.
- **Real in-process tools**; the template's `EnvApiToolset` is kept but only added when `ENV_API_URL` is set.
- **Model:** `gemini-3.5-flash`; embeddings `gemini-embedding-001`.

Follow-on (not yet built): swap protocol, disruption cascade + overflow,
wiring the Next.js demo to the live personal agent, real ElevenLabs/Calendar.
