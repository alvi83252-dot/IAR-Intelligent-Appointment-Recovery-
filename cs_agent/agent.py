"""IAR GP practice front desk agent: policy + env tools + KB search (RAG)."""

import os
import sys
from pathlib import Path

_agent_dir = Path(__file__).resolve().parent
for candidate in (_agent_dir, _agent_dir.parent):
    if (candidate / "agent_llm.py").exists():
        sys.path.insert(0, str(candidate))
        break

from google.adk.agents import LlmAgent

from agent_llm import resolve_adk_model
from env_toolset import EnvApiToolset
from rag_tools import kb_search_bm25, kb_search_vector

POLICY_PATH = Path(os.environ.get("KB_POLICY_PATH", "/app/kb/policy.md"))

RAG_GUIDANCE = """

## Knowledge Base Access

You do NOT have the knowledge base inlined. Before answering policy questions
or performing scenario-specific procedures, search the knowledge base:
- kb_search_bm25(query): keyword search.
- kb_search_vector(query): semantic search for natural-language questions.

Search before you act; procedures, eligibility rules, internal tool names,
and scenario-specific guidance all live in the knowledge base. If a search
comes up empty, rephrase and try again before telling the patient you can't
find the information.
"""

root_agent = LlmAgent(
    name="cs_agent",
    model=resolve_adk_model(),
    instruction=POLICY_PATH.read_text() + RAG_GUIDANCE,
    tools=[EnvApiToolset(), kb_search_bm25, kb_search_vector],
)
