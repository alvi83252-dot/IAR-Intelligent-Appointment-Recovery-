"""Research-agent tools: assess_priority + rank_swap_candidates.

Plain functions (no ADK import) so they are unit-testable and double as ADK
FunctionTools. The score is computed ONLY here from the fixed rubric — caller
urgency is never trusted; red flags hard-override to escalation.
"""

import json
import re

from rubric import (
    RUBRIC,
    access_value,
    band_for_score,
    classify_clinical,
    clinical_value,
    is_red_flag,
    vulnerability_value,
    wait_value,
)

_BAND_ORDER = {"admin": 0, "routine": 1, "soon": 2, "urgent": 3, "emergency": 4}


def _parse_flags(vulnerability_flags) -> list[str]:
    if not vulnerability_flags:
        return []
    if isinstance(vulnerability_flags, list):
        return [str(f).strip() for f in vulnerability_flags if str(f).strip()]
    return [f.strip() for f in re.split(r"[,;]", str(vulnerability_flags)) if f.strip()]


def assess_priority(
    symptoms: str,
    age_band: str = "",
    vulnerability_flags: str = "",
    days_already_waited: int = 0,
    travel_minutes: int = 0,
    clinical_category: str = "",
    request_ref: str = "",
) -> dict:
    """Score a GP appointment request's priority from symptoms and context.

    The clinical urgency is mapped onto a fixed rubric (red_flag, worsening_acute,
    stable_acute, chronic_review, routine, admin); never pass a numeric urgency.
    Optionally name a rubric row in `clinical_category` (it is validated); leave it
    blank to let the agent classify. `vulnerability_flags` is comma-separated.

    Returns score (0-100), band, component breakdown, a plain-English rationale,
    and an escalation flag/target. Emergency/red-flag cases escalate and must not
    be booked.
    """
    flags = _parse_flags(vulnerability_flags)
    red = is_red_flag(symptoms or "")
    if red:
        category, reason = "red_flag", f"red-flag feature ({red})"
    elif clinical_category in RUBRIC:
        category, reason = clinical_category, "category selected by caller (validated against rubric)"
    else:
        category, reason = classify_clinical(symptoms or "")

    clinical = clinical_value(category)
    wait = wait_value(int(days_already_waited or 0))
    vuln, vuln_reason = vulnerability_value(age_band, flags)
    access = access_value(int(travel_minutes or 0))

    raw = 100.0 * (0.50 * clinical + 0.20 * wait + 0.15 * vuln + 0.15 * access)
    score = round(raw)
    band = band_for_score(score)

    escalate = category == "red_flag" or band == "emergency"
    if escalate:
        band = "emergency"
        escalation_target = "999" if category == "red_flag" else "111"
    else:
        escalation_target = None

    rationale = (
        f"{category.replace('_', ' ').title()}: {reason}; "
        f"wait {int(days_already_waited or 0)}d, {vuln_reason}. "
        f"Score {score}/100 -> {band}."
    )
    if escalate:
        rationale += f" ESCALATE to {escalation_target} - do not book."

    return {
        "request_ref": request_ref or None,
        "score": score,
        "band": band,
        "category": category,
        "components": {
            "clinical_urgency": round(clinical, 3),
            "wait_time": round(wait, 3),
            "vulnerability": round(vuln, 3),
            "access_burden": round(access, 3),
        },
        "rationale": rationale,
        "escalate": escalate,
        "escalation_target": escalation_target,
    }


def rank_swap_candidates(bookings_json: str) -> dict:
    """Rank existing bookings for displacement, least clinically critical first.

    `bookings_json` is a JSON array of bookings, each with at least patient_ref and
    either score (0-100) or band; optional vulnerability_flags and same_day (bool).
    Vulnerable patients and same-day bookings are never eligible for displacement.
    """
    try:
        bookings = json.loads(bookings_json or "[]")
        if not isinstance(bookings, list):
            raise ValueError("expected a JSON array")
    except (json.JSONDecodeError, ValueError) as exc:
        return {"error": True, "content": f"Invalid bookings_json: {exc}", "ranked": []}

    def sort_key(b: dict):
        if b.get("score") is not None:
            return float(b["score"])
        return _BAND_ORDER.get(str(b.get("band", "routine")).lower(), 1) * 25.0

    ranked = []
    for b in sorted(bookings, key=sort_key):
        flags = _parse_flags(b.get("vulnerability_flags"))
        same_day = bool(b.get("same_day"))
        eligible = not flags and not same_day
        reason = (
            "eligible" if eligible
            else ("vulnerable - never displaced" if flags else "same-day - excluded")
        )
        ranked.append({
            "patient_ref": b.get("patient_ref"),
            "score": b.get("score"),
            "band": b.get("band"),
            "displacement_eligible": eligible,
            "reason": reason,
        })
    return {"ranked": ranked}
