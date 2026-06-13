# Launch the three IAR agents locally without Docker (Windows / PowerShell).
# Redis is optional for local dev — the research agent's RAG degrades gracefully
# if Redis is unreachable (assess_priority and Linkup still work).
#
#   ./scripts/run_all.ps1
#
# Stop the printed PIDs with: Stop-Process -Id <id1>,<id2>,<id3>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$agents = Join-Path $root "agents"
$env:PYTHONPATH = $agents

function Start-Agent([string]$name, [int]$port) {
    $dir = Join-Path $agents $name
    Write-Host "Starting $name on :$port"
    return Start-Process -FilePath "python" `
        -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$port" `
        -WorkingDirectory $dir -PassThru
}

$research = Start-Agent "research" 9003   # innermost; builds KB index first
Start-Sleep -Seconds 2
$frontdesk = Start-Agent "frontdesk" 9002
$personal = Start-Agent "personal" 9001

Write-Host ""
Write-Host "PIDs: research=$($research.Id) frontdesk=$($frontdesk.Id) personal=$($personal.Id)"
Write-Host "Stop all: Stop-Process -Id $($research.Id),$($frontdesk.Id),$($personal.Id)"
Write-Host "Cards:  http://localhost:9001/.well-known/agent-card.json (and :9002, :9003)"
