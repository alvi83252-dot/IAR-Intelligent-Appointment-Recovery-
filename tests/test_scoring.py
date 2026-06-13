"""Unit tests for the research agent's deterministic scoring (no ADK/LLM/Redis)."""

import json

from scoring import assess_priority, rank_swap_candidates


def test_red_flag_always_escalates_and_never_books():
    r = assess_priority("severe chest pain spreading to my arm, sweating")
    assert r["category"] == "red_flag"
    assert r["escalate"] is True
    assert r["band"] == "emergency"
    assert r["escalation_target"] == "999"
    assert "do not book" in r["rationale"].lower()


def test_caller_supplied_urgency_is_ignored():
    # No numeric urgency input exists; an admin request stays low regardless.
    r = assess_priority("I need a repeat prescription for my inhaler")
    assert r["category"] == "admin"
    assert r["band"] in ("admin", "routine")
    assert r["escalate"] is False


def test_worsening_acute_with_vulnerability_scores_higher_than_routine():
    urgent = assess_priority(
        "worsening cough and fever, getting worse each day",
        age_band="60-69", vulnerability_flags="copd", days_already_waited=4,
    )
    routine = assess_priority("mild blocked nose for a day")
    assert urgent["score"] > routine["score"]
    assert urgent["components"]["vulnerability"] == 0.9


def test_age_70_plus_is_vulnerable_without_flags():
    r = assess_priority("sore throat", age_band="70-79")
    assert r["components"]["vulnerability"] == 0.9


def test_wait_time_component_caps_at_one():
    r = assess_priority("ongoing back ache", days_already_waited=999)
    assert r["components"]["wait_time"] == 1.0


def test_caller_category_is_validated_against_rubric():
    bogus = assess_priority("sore throat", clinical_category="super_urgent_please")
    legit = assess_priority("sore throat", clinical_category="chronic_review")
    # bogus falls back to keyword classification (acute -> stable_acute)
    assert bogus["category"] == "stable_acute"
    assert legit["category"] == "chronic_review"


def test_score_formula_matches_weights():
    # admin (0.1 clinical), no wait/vuln(0.3)/access -> 100*(.05 + 0 + .045 + 0) = 9.5 -> 10
    r = assess_priority("repeat prescription", clinical_category="admin")
    assert r["score"] == 10
    assert r["band"] == "admin"


def test_rank_swap_excludes_vulnerable_and_same_day():
    bookings = json.dumps([
        {"patient_ref": "P-1", "score": 30},
        {"patient_ref": "P-2", "score": 20, "vulnerability_flags": "copd"},
        {"patient_ref": "P-3", "score": 10, "same_day": True},
    ])
    out = rank_swap_candidates(bookings)["ranked"]
    assert [b["patient_ref"] for b in out] == ["P-3", "P-2", "P-1"]  # ascending score
    eligible = {b["patient_ref"]: b["displacement_eligible"] for b in out}
    assert eligible == {"P-1": True, "P-2": False, "P-3": False}


def test_rank_swap_handles_bad_json():
    out = rank_swap_candidates("not json")
    assert out["error"] is True and out["ranked"] == []
