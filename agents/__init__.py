"""IAR A2A agents (personal, frontdesk, research).

Spec-faithful Python backend per ../CLAUDE.md. Shared code lives in
`agents.common`; each agent is an independent A2A server that imports only from
`agents.common`, never from a sibling agent's package.
"""
