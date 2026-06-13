"""`find_alternatives` grounding for the IAR research agent.

Returns NHS-service signposting (Pharmacy First, walk-in / urgent treatment
centres, NHS 111, self-care) for a request, grounded in OFFICIAL NHS WEBSITE
sources via Linkup web search. If Linkup is unavailable (no key, an error, or no
NHS-allowlisted results) it falls back to a built-in mock directory, so the
research agent NEVER blocks a booking (degradation ladder).

Scope guardrails (see CLAUDE.md / iar-domain-rules):
- Used ONLY for `find_alternatives` signposting. It NEVER influences clinical
  priority scores (`assess_priority`) or the 111/999 escalation decision — those
  stay deterministic in `rubric.py`.
- Results are restricted to official NHS website domains (`nhs.uk`,
  `england.nhs.uk`). Any result whose source host is not on the allowlist is
  dropped — we never surface a non-NHS link as official guidance.
- Never send patient symptoms/PII verbatim — callers pass a short *service*
  query (e.g. "Pharmacy First eligibility sore throat adult").

Standalone smoke test (project rule A — verify in isolation first):

    python -m agents.research.services_directory "urinary tract infection"
"""
from __future__ import annotations

import sys
from dataclasses import asdict, dataclass
from urllib.parse import urlparse

from agents.common import config

# Official NHS website domains — the ONLY sources allowed for signposting.
NHS_ALLOWLIST: tuple[str, ...] = ("nhs.uk", "england.nhs.uk")

# Linkup tuning: this runs on the request path, so keep it fast (standard depth,
# small result set). Never use "deep" here (5-30s) — it risks the 30s A2A budget.
_SEARCH_DEPTH = "standard"
_MAX_RESULTS = 5


@dataclass
class Alternative:
    """A single signposting option, grounded in an official NHS page."""

    title: str
    summary: str
    source_url: str
    source_name: str
    grounded: bool = True  # False => served from the mock fallback

    def as_dict(self) -> dict:
        return asdict(self)


def _host_allowed(url: str) -> bool:
    """True only if `url`'s host is exactly, or a subdomain of, an allowlisted NHS domain."""
    host = (urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in NHS_ALLOWLIST)


def _coerce_results(response: object) -> list:
    """Normalise a Linkup searchResults response to a list of result items."""
    results = getattr(response, "results", None)
    if results is None and isinstance(response, dict):
        results = response.get("results")
    return list(results or [])


def _field(item: object, name: str, default: str = "") -> str:
    val = getattr(item, name, None)
    if val is None and isinstance(item, dict):
        val = item.get(name)
    return val if isinstance(val, str) else default


def _results_to_alternatives(response: object) -> list[Alternative]:
    """Map a Linkup searchResults response to Alternatives, enforcing the NHS allowlist."""
    alts: list[Alternative] = []
    for item in _coerce_results(response):
        url = _field(item, "url")
        if not url or not _host_allowed(url):
            continue  # defensive: only official NHS sources ever surface
        alts.append(
            Alternative(
                title=_field(item, "name", "NHS service"),
                summary=_field(item, "content")[:400],
                source_url=url,
                source_name=(urlparse(url).hostname or "nhs.uk"),
            )
        )
    return alts


def find_alternatives(query: str, *, max_results: int = _MAX_RESULTS) -> list[Alternative]:
    """Return NHS-sourced signposting alternatives for `query`.

    Tries Linkup (official NHS domains only); on any failure or empty result it
    returns the built-in mock directory. Never raises — research must never block.
    """
    if not config.LINKUP_API_KEY:
        return _mock_alternatives(query)
    try:
        alts = _linkup_alternatives(query, api_key=config.LINKUP_API_KEY, max_results=max_results)
    except Exception:
        # Degradation ladder: any Linkup error -> mock directory, never block.
        alts = []
    return alts or _mock_alternatives(query)


def _linkup_alternatives(query: str, *, api_key: str, max_results: int) -> list[Alternative]:
    """Query Linkup for NHS-sourced results. Imported lazily so the module loads w/o the SDK."""
    from linkup import LinkupClient  # type: ignore import-not-found

    client = LinkupClient(api_key=api_key)
    try:
        response = client.search(
            query=query,
            depth=_SEARCH_DEPTH,
            output_type="searchResults",
            include_domains=list(NHS_ALLOWLIST),
            max_results=max_results,
        )
    except TypeError:
        # Older SDKs may not accept include_domains/max_results — retry minimal.
        # The NHS allowlist is still enforced client-side in _results_to_alternatives.
        response = client.search(query=query, depth=_SEARCH_DEPTH, output_type="searchResults")
    return _results_to_alternatives(response)


def _mock_alternatives(query: str) -> list[Alternative]:
    """Built-in fallback signposting (official NHS URLs), used when Linkup is unavailable."""
    return [
        Alternative(
            title="Pharmacy First — advice and treatment from a pharmacy",
            summary="Pharmacies can advise on, and for some conditions supply prescription "
            "medicine for, minor illnesses without a GP appointment.",
            source_url="https://www.nhs.uk/nhs-services/pharmacies/",
            source_name="www.nhs.uk",
            grounded=False,
        ),
        Alternative(
            title="NHS 111 — help for urgent (non-emergency) problems",
            summary="Use NHS 111 online or call 111 if you need urgent help and are unsure where "
            "to go. For life-threatening emergencies always call 999.",
            source_url="https://111.nhs.uk/",
            source_name="111.nhs.uk",
            grounded=False,
        ),
        Alternative(
            title="Urgent treatment centres and walk-in services",
            summary="Urgent treatment centres handle many non-life-threatening injuries and "
            "illnesses without an appointment.",
            source_url="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/",
            source_name="www.nhs.uk",
            grounded=False,
        ),
    ]


def _smoke(query: str) -> int:
    source = "Linkup (NHS-grounded)" if config.LINKUP_API_KEY else "mock fallback (no LINKUP_API_KEY)"
    print(f"find_alternatives({query!r}) — source: {source}\n")
    alts = find_alternatives(query)
    if not alts:
        print("No alternatives returned.")
        return 1
    for i, a in enumerate(alts, 1):
        tag = "" if a.grounded else "  [mock]"
        print(f"{i}. {a.title}{tag}\n   {a.source_url}\n   {a.summary[:160]}\n")
    violations = [a.source_url for a in alts if not _host_allowed(a.source_url)]
    if violations:
        print(f"ALLOWLIST VIOLATION (non-NHS source surfaced): {violations}")
        return 1
    print(f"OK — {len(alts)} alternative(s), all official NHS sources.")
    return 0


if __name__ == "__main__":
    raise SystemExit(_smoke(" ".join(sys.argv[1:]) or "sore throat"))
