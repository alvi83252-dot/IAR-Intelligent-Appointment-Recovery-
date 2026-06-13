"""Shared code for the three IAR A2A agents (personal, frontdesk, research).

Only cross-cutting helpers live here: configuration/env loading, the generic
A2A peer-call client, the session-id helper, and the optional harness env
toolset. No agent imports another agent's package — they share code ONLY via
this module (per CLAUDE.md working agreements).
"""
