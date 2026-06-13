#!/usr/bin/env bash
# Launch the three IAR agents locally without Docker (macOS / Linux / git-bash).
# Redis is optional — the research agent's RAG degrades gracefully if Redis is
# unreachable (assess_priority and Linkup still work).
#
#   ./scripts/run_all.sh        # Ctrl-C stops all three
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PYTHONPATH="$ROOT/agents"

pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

( cd "$ROOT/agents/research"  && exec python -m uvicorn main:app --host 0.0.0.0 --port 9003 ) & pids+=($!)
sleep 2   # research builds the KB index before serving
( cd "$ROOT/agents/frontdesk" && exec python -m uvicorn main:app --host 0.0.0.0 --port 9002 ) & pids+=($!)
( cd "$ROOT/agents/personal"  && exec python -m uvicorn main:app --host 0.0.0.0 --port 9001 ) & pids+=($!)

echo "Agents up: personal :9001, frontdesk :9002, research :9003 (pids: ${pids[*]})"
echo "Cards: http://localhost:9001/.well-known/agent-card.json"
wait
