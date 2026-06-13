"""Thin, provider-swappable LLM wrapper for the IAR agents.

Keep ALL model calls behind this module so the provider can be changed in one
place (per ``CLAUDE.md`` / the project spec). Today it speaks to Google Gemini
via the ``google-genai`` SDK; swapping providers means adding one class here and
registering it in ``_PROVIDERS`` — agent code never imports an SDK directly.

The personal agent and the front-desk ("customer service") agent default to
Gemini Flash; see ``.env`` / ``agents/common/config.py`` for per-agent models.

Run the standalone smoke test (instruction A — verify in isolation first)::

    python -m agents.common.llm
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from . import config


class LLMError(RuntimeError):
    """Raised when the LLM provider is misconfigured or a call fails."""


@runtime_checkable
class LLMClient(Protocol):
    """Minimal contract every provider implementation must satisfy."""

    model: str

    def complete(self, prompt: str, *, system: str | None = None) -> str:
        """Return the model's text completion for ``prompt``."""
        ...


@dataclass
class GeminiClient:
    """Google Gemini implementation of :class:`LLMClient` (via ``google-genai``)."""

    model: str
    api_key: str
    _client: object = field(default=None, init=False, repr=False)

    def __post_init__(self) -> None:
        if not self.api_key:
            raise LLMError(
                "GEMINI_API_KEY is not set. Add it to your .env (see .env.example)."
            )
        try:
            from google import genai  # type: ignore import-not-found
        except ImportError as exc:  # pragma: no cover - depends on install state
            raise LLMError(
                "google-genai is not installed. Run: pip install -r requirements.txt"
            ) from exc
        self._client = genai.Client(api_key=self.api_key)

    def complete(self, prompt: str, *, system: str | None = None) -> str:
        from google.genai import types  # type: ignore import-not-found

        cfg = types.GenerateContentConfig(system_instruction=system) if system else None
        try:
            resp = self._client.models.generate_content(  # type: ignore[attr-defined]
                model=self.model, contents=prompt, config=cfg
            )
        except Exception as exc:  # surface provider/model errors as LLMError
            raise LLMError(f"Gemini call failed (model={self.model}): {exc}") from exc
        return (resp.text or "").strip()


# provider name -> implementation. Add new providers here only.
_PROVIDERS: dict[str, type] = {"gemini": GeminiClient}


def get_llm_for_model(model: str) -> LLMClient:
    """Return an LLM client bound to an explicit ``model`` id (provider from ``LLM_PROVIDER``)."""
    provider = config.LLM_PROVIDER.lower()
    impl = _PROVIDERS.get(provider)
    if impl is None:
        raise LLMError(
            f"Unknown LLM_PROVIDER '{provider}'. Known providers: {sorted(_PROVIDERS)}"
        )
    return impl(model=model, api_key=config.GEMINI_API_KEY)


def get_llm(agent: str) -> LLMClient:
    """Return an LLM client for ``agent`` (personal|frontdesk|research).

    Model comes from :func:`config.model_for`; provider from ``LLM_PROVIDER``
    (default ``gemini``). Raises :class:`LLMError` on misconfiguration.
    """
    return get_llm_for_model(config.model_for(agent))


def _smoke() -> int:
    """Check every configured model is responsive, in isolation.

    Covers each agent's model (personal / frontdesk / research), de-duplicated,
    reporting which roles use each model.
    Continues through all models so one failure doesn't hide the rest.
    """
    print(f"provider={config.LLM_PROVIDER}  default_model={config.DEFAULT_LLM_MODEL}")

    # distinct configured model -> roles that use it
    roles: dict[str, list[str]] = {}
    for agent in ("personal", "frontdesk", "research"):
        roles.setdefault(config.model_for(agent), []).append(agent)

    failures = 0
    for model, used_by in roles.items():
        print(f"\n[{model}]  used by: {', '.join(used_by)}")
        try:
            client = get_llm_for_model(model)
            reply = client.complete(
                "Reply with exactly: IAR LLM OK",
                system="You are a terse health-service scheduling assistant.",
            )
            print(f"[{model}] -> {reply!r}")
        except LLMError as exc:
            print(f"[{model}] NOT RESPONSIVE: {exc}")
            failures += 1

    checked = len(roles)
    if failures:
        print(f"\n{failures}/{checked} model(s) NOT responsive.")
        return 1
    print(f"\nAll {checked} configured model(s) responded. OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(_smoke())
