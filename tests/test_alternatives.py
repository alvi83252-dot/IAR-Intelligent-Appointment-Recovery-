"""Isolated tests for the research agent's find_alternatives grounding.

Run from the repo root:  pytest tests/test_alternatives.py
No network or Linkup SDK required — the Linkup boundary is mocked.
"""
from __future__ import annotations

from agents.research import services_directory as sd


def test_host_allowed_accepts_official_nhs_only():
    assert sd._host_allowed("https://www.nhs.uk/conditions/")
    assert sd._host_allowed("https://111.nhs.uk/")
    assert sd._host_allowed("https://england.nhs.uk/x")
    assert not sd._host_allowed("https://www.example.com/")
    assert not sd._host_allowed("https://nhs.uk.phishing.com/")  # suffix-attack guard
    assert not sd._host_allowed("")


def test_results_filtered_to_nhs_allowlist():
    fake_response = {
        "results": [
            {"name": "NHS pharmacy", "url": "https://www.nhs.uk/a", "content": "x"},
            {"name": "Random blog", "url": "https://blog.example.com/b", "content": "y"},
            {"name": "NHS 111", "url": "https://111.nhs.uk/", "content": "z"},
        ]
    }
    alts = sd._results_to_alternatives(fake_response)
    assert [a.source_url for a in alts] == ["https://www.nhs.uk/a", "https://111.nhs.uk/"]
    assert all(sd._host_allowed(a.source_url) for a in alts)
    assert all(a.grounded for a in alts)


def test_fallback_when_no_key(monkeypatch):
    monkeypatch.setattr(sd.config, "LINKUP_API_KEY", "")
    alts = sd.find_alternatives("sore throat")
    assert alts and all(a.grounded is False for a in alts)  # mock used
    assert all(sd._host_allowed(a.source_url) for a in alts)  # mock URLs are NHS too


def test_fallback_when_linkup_errors(monkeypatch):
    monkeypatch.setattr(sd.config, "LINKUP_API_KEY", "fake-key")

    def boom(*_a, **_k):
        raise RuntimeError("linkup down")

    monkeypatch.setattr(sd, "_linkup_alternatives", boom)
    alts = sd.find_alternatives("sore throat")
    assert alts and all(a.grounded is False for a in alts)  # error -> mock, no exception
