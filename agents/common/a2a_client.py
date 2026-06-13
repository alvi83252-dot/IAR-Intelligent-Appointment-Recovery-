"""Generic A2A peer-call client used by the agents' downstream tools.

Mirrors the template's `cs_client_tool.py` wire handling: send one Message with
streaming OFF, then read the reply text from a returned `Message`, or from a
returned `Task`'s artifacts plus its final `status.message` (all text parts,
joined). The caller passes the session's contextId so the chain shares one
identity. A peer failure degrades to a readable string rather than raising, so a
downstream outage never strands the turn (CLAUDE.md degradation ladder).
"""

import uuid

import httpx
from a2a.client import ClientConfig, ClientFactory, minimal_agent_card
from a2a.types import Message, Part, Role, Task, TextPart

from common.config import A2A_TIMEOUT_S


def _text_of_message(message: Message) -> str:
    texts = []
    for part in message.parts or []:
        root = getattr(part, "root", part)
        if isinstance(root, TextPart) and root.text:
            texts.append(root.text)
    return "\n".join(texts)


def _text_of_task(task: Task) -> str:
    texts = []
    for artifact in task.artifacts or []:
        for part in artifact.parts or []:
            root = getattr(part, "root", part)
            if isinstance(root, TextPart) and root.text:
                texts.append(root.text)
    if task.status is not None and task.status.message is not None:
        text = _text_of_message(task.status.message)
        if text:
            texts.append(text)
    return "\n".join(texts)


async def ask_agent(url: str, message: str, context_id: str,
                    timeout: float = A2A_TIMEOUT_S) -> str:
    """Send one message to the A2A agent at `url` and return its reply text.

    `context_id` is propagated as the A2A contextId (shared session identity).
    On any transport/protocol error, returns a degraded `[peer unavailable ...]`
    string instead of raising.
    """
    outgoing = Message(
        message_id=uuid.uuid4().hex,
        role=Role.user,
        parts=[Part(root=TextPart(text=message))],
        context_id=context_id,
    )
    try:
        async with httpx.AsyncClient(timeout=timeout) as http_client:
            client = ClientFactory(
                ClientConfig(streaming=False, httpx_client=http_client)
            ).create(minimal_agent_card(url, ["JSONRPC"]))
            reply = ""
            async for event in client.send_message(outgoing):
                if isinstance(event, Message):
                    reply = _text_of_message(event) or reply
                elif isinstance(event, tuple) and isinstance(event[0], Task):
                    reply = _text_of_task(event[0]) or reply
        return reply or "[no response from peer]"
    except Exception as exc:  # degrade, never strand the turn
        return f"[peer unavailable at {url}: {type(exc).__name__}]"
