"""End-to-end, text-only interop test of the canonical chain.

Drives a plain-text booking request at the personal agent (:9001) and asserts a
sensible reply comes back, exercising personal -> frontdesk -> research over real
A2A with one shared contextId. Requires the three agents running (docker compose
up, or scripts/run_all) and model credentials; skips cleanly otherwise.

    docker compose up --build         # or ./scripts/run_all.ps1
    pytest tests/test_interop_textonly.py -q
"""

import asyncio
import os
import uuid

import pytest

pytest.importorskip("a2a", reason="a2a-sdk not installed (agent runtime deps)")
import httpx  # noqa: E402

from common.a2a_client import ask_agent  # noqa: E402

PERSONAL_URL = os.environ.get("PERSONAL_AGENT_URL", "http://localhost:9001/")


def _reachable(url: str) -> bool:
    try:
        httpx.get(url.rstrip("/") + "/.well-known/agent-card.json", timeout=3.0)
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _reachable(PERSONAL_URL),
                    reason=f"personal agent not reachable at {PERSONAL_URL}")
def test_booking_request_returns_a_reply():
    context_id = uuid.uuid4().hex
    request = (
        "Hi, I'm Alan Rowe. I've had a worsening cough and fever for several days "
        "and I have COPD. I'd like the earliest GP appointment, mornings if possible."
    )
    reply = asyncio.run(ask_agent(PERSONAL_URL, request, context_id, timeout=300.0))
    assert reply and not reply.startswith("[peer unavailable")
    assert not reply.startswith("[no response")
    # The personal agent should have engaged the practice and come back with
    # something actionable (a slot/booking/time) or a clear next step.
    assert len(reply) > 20
