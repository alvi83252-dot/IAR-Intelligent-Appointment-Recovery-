"""OPTIONAL live web grounding for NHS service signposting via Linkup.

Only wired into the research agent when LINKUP_API_KEY is set. Restricts results
to official NHS domains. Used to supplement (not replace) the Redis RAG knowledge
base for find_alternatives-style questions.
"""

import httpx

from common.config import LINKUP_API_KEY

_LINKUP_URL = "https://api.linkup.so/v1/search"
_NHS_DOMAINS = ["nhs.uk", "england.nhs.uk"]


def find_alternatives_web(query: str) -> dict:
    """Search official NHS web sources for alternative-service / signposting info.

    Use for up-to-date eligibility or service questions not covered by the local
    knowledge base. Returns a sourced answer with citations, or an error entry.

    Args:
        query: A natural-language question, e.g. "Pharmacy First UTI eligibility".
    """
    if not LINKUP_API_KEY:
        return {"error": True, "content": "Linkup grounding not configured (LINKUP_API_KEY unset)."}
    try:
        resp = httpx.post(
            _LINKUP_URL,
            headers={"Authorization": f"Bearer {LINKUP_API_KEY}",
                     "Content-Type": "application/json"},
            json={
                "q": query,
                "depth": "standard",
                "outputType": "sourcedAnswer",
                "includeDomains": _NHS_DOMAINS,
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            return {"error": True, "content": f"Linkup HTTP {resp.status_code}"}
        data = resp.json()
        sources = [{"name": s.get("name"), "url": s.get("url")}
                   for s in (data.get("sources") or [])[:5]]
        return {"answer": data.get("answer", ""), "sources": sources}
    except Exception as exc:
        return {"error": True, "content": f"Linkup unavailable ({type(exc).__name__})."}
