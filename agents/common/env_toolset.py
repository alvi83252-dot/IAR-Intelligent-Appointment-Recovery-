"""OPTIONAL dynamic ADK toolset over a harness env API (template parity).

The a2a-hackathon template sources every domain tool live from a harness env API
(`GET/POST {ENV_API_URL}/sessions/{contextId}/tools[/{name}]`). IAR runs
standalone with real in-process tools, so this toolset is OFF by default and is
only added to an agent when `ENV_API_URL` is set. Kept verbatim-compatible with
the template so an external env API can be plugged in unchanged.
"""

import json
from typing import Any, Optional

import httpx
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.tools import BaseTool, FunctionTool, ToolContext
from google.adk.tools.base_toolset import BaseToolset
from google.genai import types

from common.config import ENV_API_TOKEN, ENV_API_URL
from common.session import session_id

_BASE = ENV_API_URL.rstrip("/")
_HEADERS = {"Authorization": f"Bearer {ENV_API_TOKEN}"}


async def _post_tool_call(sid: str, name: str, arguments: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{_BASE}/sessions/{sid}/tools/{name}",
            json={"arguments": arguments},
            headers=_HEADERS,
        )
        if resp.status_code != 200:
            return {"error": True, "content": f"HTTP {resp.status_code}: {resp.text}"}
        return resp.json()


async def call_env_tool(tool_name: str, arguments_json: str,
                        tool_context: ToolContext) -> dict:
    """Call any environment tool by name (`arguments_json` is a JSON object string)."""
    try:
        arguments = json.loads(arguments_json or "{}")
    except json.JSONDecodeError as exc:
        return {"error": True, "content": f"Invalid arguments JSON: {exc}"}
    return await _post_tool_call(session_id(tool_context), tool_name, arguments)


class EnvApiTool(BaseTool):
    """One env tool, declared from its OpenAI-style schema."""

    def __init__(self, schema: dict):
        function = schema["function"]
        super().__init__(name=function["name"], description=function.get("description", ""))
        self._parameters = function.get("parameters")

    def _get_declaration(self) -> types.FunctionDeclaration:
        return types.FunctionDeclaration(
            name=self.name, description=self.description,
            parameters_json_schema=self._parameters,
        )

    async def run_async(self, *, args: dict[str, Any], tool_context: ToolContext) -> dict:
        return await _post_tool_call(session_id(tool_context), self.name, args)


class EnvApiToolset(BaseToolset):
    """Serves the env tools for the current session plus the generic fallback."""

    async def get_tools(self, readonly_context: Optional[ReadonlyContext] = None) -> list[BaseTool]:
        fallback: list[BaseTool] = [FunctionTool(call_env_tool)]
        if readonly_context is None or not _BASE:
            return fallback
        sid = session_id(readonly_context)
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{_BASE}/sessions/{sid}/tools", headers=_HEADERS)
        resp.raise_for_status()
        return [EnvApiTool(s) for s in resp.json()["tools"]] + fallback

    async def close(self) -> None:
        pass
