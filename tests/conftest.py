"""Make the agent packages importable in tests.

Adds agents/ (for `common`) and each agent dir (for its sibling modules like
`rubric`, `scoring`, `ledger`) to sys.path, so unit tests can import the pure
domain logic without ADK or a running server.
"""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_AGENTS = _ROOT / "agents"

for path in (_AGENTS, _AGENTS / "research", _AGENTS / "frontdesk", _AGENTS / "personal"):
    p = str(path)
    if p not in sys.path:
        sys.path.insert(0, p)
