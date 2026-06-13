"""IAR research agent — clinical triage, signposting, and swap-candidate ranking.

Scoring (`assess_priority`) and `rank_swap_candidates` are deterministic LLM +
fixed-rubric tasks (built later). `services_directory` provides the
`find_alternatives` signposting, grounded in official NHS website sources via
Linkup with a mock fallback.
"""
