"""Central configuration for the IAR Python agents.

Loads environment variables (from the repo-root ``.env`` if present) and exposes
typed settings. Secrets — the LLM API key — live ONLY in the environment / the
gitignored ``.env`` file, never in code or git.

Per-agent model selection (see ``.env`` / ``.env.example``): the personal agent
and the front-desk ("customer service") agent default to Gemini Flash.
"""
from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv not installed yet — fall back to real env vars
    load_dotenv = None

# Repo root is two levels up from this file: agents/common/config.py -> repo/.
_REPO_ROOT = Path(__file__).resolve().parents[2]

if load_dotenv is not None:
    load_dotenv(_REPO_ROOT / ".env")

# Provider + default model (override per agent below).
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
DEFAULT_LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3.5-flash")

# API key. Accept GOOGLE_API_KEY as an alias (the google-genai SDK uses it too).
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

# Linkup web-search key — used ONLY for the research agent's find_alternatives
# signposting (official NHS sources). Empty => the built-in mock directory is used.
LINKUP_API_KEY: str = os.getenv("LINKUP_API_KEY", "")

# Per-agent model selection. Personal + Front Desk run on Gemini Flash; research
# is configured independently (defaults to the same model if unset).
AGENT_MODELS: dict[str, str] = {
    "personal": os.getenv("PERSONAL_AGENT_MODEL", DEFAULT_LLM_MODEL),
    "frontdesk": os.getenv("FRONTDESK_AGENT_MODEL", DEFAULT_LLM_MODEL),
    "research": os.getenv("RESEARCH_AGENT_MODEL", DEFAULT_LLM_MODEL),
}

# Optional cheaper/faster model for the disruption batch re-score (~14 bookings at
# once) to protect the demo timeline; defaults to the research agent's model.
RESEARCH_BATCH_MODEL: str = os.getenv("RESEARCH_BATCH_MODEL", AGENT_MODELS["research"])

# A2A service URLs (consumed once the agent servers exist; no hardcoded peers).
AGENT_URLS: dict[str, str] = {
    "personal": os.getenv("PERSONAL_AGENT_URL", "http://localhost:9001/"),
    "frontdesk": os.getenv("FRONTDESK_AGENT_URL", "http://localhost:9002/"),
    "research": os.getenv("RESEARCH_AGENT_URL", "http://localhost:9003/"),
}


def model_for(agent: str) -> str:
    """Return the configured model id for ``agent`` (personal|frontdesk|research)."""
    return AGENT_MODELS.get(agent, DEFAULT_LLM_MODEL)
