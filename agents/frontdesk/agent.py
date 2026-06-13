"""IAR Front Desk Agent: GP practice ledger + priority-based allocation."""

from pathlib import Path

from google.adk.agents import LlmAgent

from common.config import ENV_API_URL, MODEL
from ledger import book_slot, cancel_or_rebook, find_slots
from research_client_tool import ask_research

POLICY = (Path(__file__).resolve().parent / "policy.md").read_text(encoding="utf-8")

tools = [find_slots, book_slot, cancel_or_rebook, ask_research]

if ENV_API_URL:  # template-parity: external harness env tools, off by default
    from common.env_toolset import EnvApiToolset

    tools.append(EnvApiToolset())

root_agent = LlmAgent(
    name="iar_frontdesk_agent",
    model=MODEL,
    description=(
        "GP practice front-desk agent. Manages the appointment ledger (availability "
        "search, booking, cancellation, rebooking) with priority-based allocation and "
        "a reserved urgent-capacity window. Consults a research agent for triage. "
        "Works with any A2A personal agent in plain text or structured data."
    ),
    instruction=POLICY,
    tools=tools,
)
