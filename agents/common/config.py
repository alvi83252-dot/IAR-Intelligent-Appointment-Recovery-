"""Central configuration for the IAR agents.

Loads the repo-root `.env` for local (non-docker) dev, reconciles the Google
credentials so the template's Vertex default and our standalone AI-Studio key
both work, and exposes the model + peer URLs every agent needs.

Import this module early (agent.py does, before the LlmAgent is built) so the
GOOGLE_* env vars are in place before google-genai reads them.
"""

import os
from pathlib import Path

# agents/common/config.py -> parents[2] is the repo root (absent in docker).
_REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    """Minimal .env loader (no dependency). Real env / compose vars win."""
    env_path = _REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()

# --- Google credentials reconciliation ---------------------------------------
# google-adk / google-genai read GOOGLE_API_KEY + GOOGLE_GENAI_USE_VERTEXAI.
# Our .env historically stored the AI-Studio key as GEMINI_API_KEY; mirror it.
if not os.environ.get("GOOGLE_API_KEY") and os.environ.get("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
# Standalone default = AI Studio (Developer API). Set true to use Vertex.
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "false")

# --- Model -------------------------------------------------------------------
# MODEL is the template's name; LLM_MODEL is IAR's existing .env key.
MODEL = os.environ.get("MODEL") or os.environ.get("LLM_MODEL") or "gemini-3.5-flash"

# --- Peer A2A URLs (discovery/overflow may override per-practice later) -------
PERSONAL_AGENT_URL = os.environ.get("PERSONAL_AGENT_URL", "http://localhost:9001/")
FRONTDESK_AGENT_URL = os.environ.get("FRONTDESK_AGENT_URL", "http://localhost:9002/")
RESEARCH_AGENT_URL = os.environ.get("RESEARCH_AGENT_URL", "http://localhost:9003/")

# --- Research RAG / grounding ------------------------------------------------
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
LINKUP_API_KEY = os.environ.get("LINKUP_API_KEY", "").strip()

# --- Optional harness env-tool API (template parity; off unless set) ----------
ENV_API_URL = os.environ.get("ENV_API_URL", "").strip()
ENV_API_TOKEN = os.environ.get("ENV_API_TOKEN", "").strip()

# Downstream A2A call budget. The template uses 300s because one personal turn
# runs a whole downstream sub-loop; keep that headroom.
A2A_TIMEOUT_S = float(os.environ.get("A2A_TIMEOUT_S", "300"))
