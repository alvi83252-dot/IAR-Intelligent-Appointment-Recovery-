"""IAR Research Agent: clinical triage scoring + NHS signposting (RAG) + swap ranking."""

from google.adk.agents import LlmAgent

from common.config import ENV_API_URL, LINKUP_API_KEY, MODEL
from rag_tools import KB_POLICY_PATH, kb_search_bm25, kb_search_vector
from scoring import assess_priority, rank_swap_candidates

RAG_GUIDANCE = """

## Knowledge base access

You do NOT have the knowledge base inlined. Before answering signposting or
service-eligibility questions, search it:
- kb_search_vector(query): semantic search for natural-language questions.
- kb_search_bm25(query): keyword search.

Search before you answer. If a search comes up empty, rephrase and try again
before saying you can't find it. To score priority, always call assess_priority
(never invent a number). To rank displacement candidates, call rank_swap_candidates.
"""

tools = [assess_priority, rank_swap_candidates, kb_search_bm25, kb_search_vector]

if LINKUP_API_KEY:
    from linkup_tool import find_alternatives_web

    tools.append(find_alternatives_web)

if ENV_API_URL:  # template-parity: external harness env tools, off by default
    from common.env_toolset import EnvApiToolset

    tools.append(EnvApiToolset())

root_agent = LlmAgent(
    name="iar_research_agent",
    model=MODEL,
    description=(
        "Clinical research and triage support agent. Scores GP appointment requests "
        "for priority with a plain-language rationale, recommends alternative NHS "
        "services (Pharmacy First, walk-in, 111/999), and ranks swap candidates. "
        "Accepts plain text or structured requests."
    ),
    instruction=KB_POLICY_PATH.read_text(encoding="utf-8") + RAG_GUIDANCE,
    tools=tools,
)
