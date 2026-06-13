# IAR Python agents

Spec-faithful home for the three A2A agents — personal (`:9001`), front desk
(`:9002`), research (`:9003`). See [`../CLAUDE.md`](../CLAUDE.md) and
[`../IAR_PROJECT_SPEC.md`](../IAR_PROJECT_SPEC.md). The Next.js app in this repo
is the edge layer; these Python servers are the A2A backend.

So far this package holds the shared **LLM layer**. The A2A servers
(`personal/`, `frontdesk/`, `research/`) are added next, each built and tested
in isolation before integration (project rule A).

## LLM configuration (Gemini Flash)

All model calls go through [`common/llm.py`](common/llm.py) — a thin,
provider-swappable wrapper. Models are selected **per agent** from the
environment, so the personal and front-desk ("customer service") agents run on
Gemini Flash:

| Agent | Env var | Default |
|---|---|---|
| Personal | `PERSONAL_AGENT_MODEL` | `gemini-3.5-flash` |
| Front Desk (customer service) | `FRONTDESK_AGENT_MODEL` | `gemini-3.5-flash` |
| Research | `RESEARCH_AGENT_MODEL` | `gemini-3.5-flash` |

The API key (`GEMINI_API_KEY`) lives only in the gitignored `.env`.

## Setup & isolated smoke test

```bash
# From the repo root:

# 1. Create your local env file and paste your key.
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
#    edit .env -> GEMINI_API_KEY=...

# 2. Install Python deps (Python 3.11+). A virtualenv is recommended.
pip install -r requirements.txt

# 3. Smoke-test the LLM layer IN ISOLATION — confirms personal + frontdesk
#    reach Gemini Flash before any agent wiring (project rule A).
python -m agents.common.llm
```

A successful run prints a line for each agent ending in `IAR LLM OK`. If
`GEMINI_API_KEY` is missing it says so; if the model id is wrong, the Gemini
provider error surfaces here (so you can adjust `*_AGENT_MODEL` in `.env`).

In code, agents obtain a client via:

```python
from agents.common.llm import get_llm

llm = get_llm("personal")          # or "frontdesk" / "research"
text = llm.complete("…", system="…optional system instruction…")
```

Swapping providers later means adding one class in `common/llm.py` and
registering it in `_PROVIDERS` — agent code never changes.
