"""Session identity == the inbound A2A contextId.

ADK keys its session on the A2A contextId, so `context.session.id` *is* the
contextId. Every env tool call and every downstream A2A message reuses it, which
keeps the whole personal -> frontdesk -> research chain inside one conversation
identity (the template's hard contract).
"""

from typing import Any


def session_id(context: Any) -> str:
    """Return the current session id (== the inbound A2A contextId)."""
    return context.session.id
