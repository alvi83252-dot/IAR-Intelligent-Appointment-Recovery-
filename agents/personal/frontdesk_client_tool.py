"""Tool that lets the personal agent contact the GP practice front-desk agent
over A2A, propagating the session contextId so both agents (and the research
agent downstream) share one conversation identity."""

from google.adk.tools import ToolContext

from common.a2a_client import ask_agent
from common.config import FRONTDESK_AGENT_URL
from common.session import session_id


async def ask_frontdesk(message: str, tool_context: ToolContext) -> str:
    """Send a message to the GP practice front-desk agent and return its reply.

    Use this to request availability, book/cancel/rebook, or relay the patient's
    symptoms and preferences. The conversation persists for the whole session, so
    you can ask follow-ups and the practice remembers the context.
    """
    return await ask_agent(FRONTDESK_AGENT_URL, message, session_id(tool_context))
