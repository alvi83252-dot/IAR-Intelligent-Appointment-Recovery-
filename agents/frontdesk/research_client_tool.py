"""Tool that lets the front-desk agent consult the research agent over A2A,
propagating the session contextId so the whole chain shares one identity."""

from google.adk.tools import ToolContext

from common.a2a_client import ask_agent
from common.config import RESEARCH_AGENT_URL
from common.session import session_id


async def ask_research(message: str, tool_context: ToolContext) -> str:
    """Ask the clinical research/triage agent to score priority or recommend
    alternative NHS services. Relay the patient's symptoms and context faithfully;
    do not supply your own urgency value. Returns the research agent's reply text.
    """
    return await ask_agent(RESEARCH_AGENT_URL, message, session_id(tool_context))
