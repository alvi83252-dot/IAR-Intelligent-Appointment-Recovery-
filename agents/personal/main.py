"""Serve the IAR personal agent over A2A.
    uvicorn main:app --host 0.0.0.0 --port 9001
"""

import os

from google.adk.a2a.utils.agent_to_a2a import to_a2a

import common.config  # noqa: F401  (loads .env + reconciles GOOGLE_* before model use)
from agent import root_agent

app = to_a2a(
    root_agent,
    host=os.environ.get("HOST", "0.0.0.0"),
    port=int(os.environ.get("PORT", "9001")),
)
