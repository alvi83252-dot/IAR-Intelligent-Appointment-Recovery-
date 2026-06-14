"""Resolve ADK LlmAgent model from env — FreeLLMAPI (OpenAI-compatible) or Gemini."""

from __future__ import annotations

import os


def resolve_adk_model():
    """Return a model id or LiteLlm wrapper for google.adk.agents.LlmAgent."""
    provider = os.environ.get("LLM_PROVIDER", "openai").strip().lower()
    model_id = os.environ.get("MODEL", "llama-3.3-70b-versatile").strip()

    if provider in {"openai", "freellmapi", "open-llm"}:
        api_key = (
            os.environ.get("FREELLMAPI_API_KEY", "").strip()
            or os.environ.get("OPENAI_API_KEY", "").strip()
        )
        base_url = (
            os.environ.get("FREELLMAPI_BASE_URL", "").strip()
            or os.environ.get("OPENAI_BASE_URL", "").strip()
            or "http://host.docker.internal:3001/v1"
        ).rstrip("/")

        if api_key:
            os.environ.setdefault("OPENAI_API_KEY", api_key)
        os.environ.setdefault("OPENAI_API_BASE", base_url)

        from google.adk.models.lite_llm import LiteLlm

        return LiteLlm(model=f"openai/{model_id}")

    return model_id
