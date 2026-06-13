"""Manual end-to-end smoke test of the IAR chain (like the template's a2a-hack smoke).

Sends one plain-text booking request to the personal agent and prints its reply,
exercising personal -> frontdesk -> research over real A2A with one contextId.
Run the agents first (docker compose up, or scripts/run_all), then:

    PYTHONPATH=agents python scripts/smoke_chain.py
    # or pass a custom message:
    PYTHONPATH=agents python scripts/smoke_chain.py "I need a repeat prescription"
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agents"))

from common.a2a_client import ask_agent  # noqa: E402
from common.config import PERSONAL_AGENT_URL  # noqa: E402

DEFAULT_MESSAGE = (
    "Hi, I'm Alan Rowe. I've had a worsening cough and fever for several days and "
    "I have COPD. I'd like the earliest GP appointment, mornings if possible."
)


async def main() -> None:
    message = " ".join(sys.argv[1:]) or DEFAULT_MESSAGE
    context_id = uuid.uuid4().hex
    print(f"-> personal agent ({PERSONAL_AGENT_URL}) [contextId={context_id[:8]}]")
    print(f"   user: {message}\n")
    reply = await ask_agent(PERSONAL_AGENT_URL, message, context_id, timeout=300.0)
    print(f"   personal agent: {reply}")


if __name__ == "__main__":
    asyncio.run(main())
