"""Serve the IAR research agent over A2A.

Ingest runs first (readiness gate, like the template's cs_agent): the agent card
is served once the KB index attempt has completed. Run:
    uvicorn main:app --host 0.0.0.0 --port 9003
"""

import os

from google.adk.a2a.utils.agent_to_a2a import to_a2a

import common.config  # noqa: F401  (loads .env + reconciles GOOGLE_* before model use)
from ingest import build_index

build_index()

from agent import root_agent  # noqa: E402  (import after the readiness gate)

app = to_a2a(
    root_agent,
    host=os.environ.get("HOST", "0.0.0.0"),
    port=int(os.environ.get("PORT", "9003")),
)
