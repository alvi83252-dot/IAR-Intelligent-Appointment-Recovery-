"""Shared agent code: configuration and the swappable LLM wrapper.

Importing this package loads environment variables from the repo-root `.env`
(via `agents.common.config`), so any agent module can read settings immediately.
"""
