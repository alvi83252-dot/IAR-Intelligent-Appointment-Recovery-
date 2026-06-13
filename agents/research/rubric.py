"""Fixed clinical-priority rubric (CLAUDE.md Priority scoring).

The numeric mapping lives ONLY here, in code — the requester can never supply an
urgency value, and the LLM cannot freestyle a number. The LLM may *name* a rubric
row (clinical_category) and the agent validates it against this table; otherwise a
deterministic keyword classifier picks the row. Red-flag detection is a hard
safety override that forces escalation regardless of the chosen row.

    score_0_100 = 100 * (0.50*clinical + 0.20*wait + 0.15*vulnerability + 0.15*access)
"""

from __future__ import annotations

import re

# Fixed rubric rows -> clinical_urgency value in [0, 1].
RUBRIC: dict[str, float] = {
    "red_flag": 1.0,
    "worsening_acute": 0.8,
    "stable_acute": 0.6,
    "chronic_review": 0.4,
    "routine": 0.25,
    "admin": 0.1,
}

WEIGHTS = {"clinical": 0.50, "wait": 0.20, "vulnerability": 0.15, "access": 0.15}

# Band thresholds (inclusive lower bounds), highest first.
BANDS = [(90, "emergency"), (70, "urgent"), (50, "soon"), (25, "routine"), (0, "admin")]

# Life-threatening features: force red_flag + escalation no matter what else.
RED_FLAG_KEYWORDS = [
    "chest pain", "tight chest", "pain in my arm", "pain spreading",
    "difficulty breathing", "trouble breathing", "struggling to breathe",
    "short of breath", "can't breathe", "cannot breathe", "gasping",
    "stroke", "face drooping", "face has dropped", "slurred speech", "arm weakness",
    "severe bleeding", "heavy bleeding", "bleeding heavily", "won't stop bleeding",
    "unconscious", "unresponsive", "passed out", "collapsed",
    "anaphylaxis", "anaphylactic", "throat closing", "swollen throat",
    "seizure", "fitting", "convulsion",
    "suicidal", "kill myself", "end my life", "overdose",
    "worst headache", "sudden severe headache", "thunderclap headache",
    "blue lips", "turning blue", "choking",
]

WORSENING_KEYWORDS = [
    "worsening", "getting worse", "worse each day", "worse every day",
    "deteriorating", "spreading", "rapidly", "more severe", "increasingly",
]

ACUTE_KEYWORDS = [
    "fever", "infection", "infected", "pain", "rash", "vomiting", "diarrhoea",
    "diarrhea", "swelling", "swollen", "injury", "wound", "cough", "sore throat",
    "earache", "ear ache", "uti", "urine", "burning", "dizzy", "dizziness",
    "bite", "sting", "shingles", "sinus", "abscess",
]

CHRONIC_REVIEW_KEYWORDS = [
    "review", "check-up", "checkup", "check up", "monitor", "monitoring",
    "ongoing", "follow-up", "follow up", "blood pressure check", "diabetic review",
    "annual", "medication review", "chronic",
]

ADMIN_KEYWORDS = [
    "repeat prescription", "prescription", "sick note", "fit note", "med cert",
    "referral letter", "form", "paperwork", "test results", "results", "letter",
]


def _contains_any(text: str, keywords: list[str]) -> str | None:
    for kw in keywords:
        if kw in text:
            return kw
    return None


def is_red_flag(symptoms: str) -> str | None:
    """Return the matched red-flag phrase, or None."""
    return _contains_any(symptoms.lower(), RED_FLAG_KEYWORDS)


def classify_clinical(symptoms: str) -> tuple[str, str]:
    """Deterministically pick a rubric row from free-text symptoms.

    Returns (category, reason). Order matters: safety first, admin only when no
    acute signal is present.
    """
    text = symptoms.lower()

    flag = is_red_flag(text)
    if flag:
        return "red_flag", f"red-flag feature ({flag!r})"

    acute_kw = _contains_any(text, ACUTE_KEYWORDS)
    admin_kw = _contains_any(text, ADMIN_KEYWORDS)
    if admin_kw and not acute_kw:
        return "admin", f"administrative request ({admin_kw!r})"

    review_kw = _contains_any(text, CHRONIC_REVIEW_KEYWORDS)
    if review_kw and not acute_kw:
        return "chronic_review", f"routine review ({review_kw!r})"

    worsening_kw = _contains_any(text, WORSENING_KEYWORDS)
    if acute_kw and worsening_kw:
        return "worsening_acute", f"worsening acute symptoms ({acute_kw!r}, {worsening_kw!r})"
    if acute_kw:
        return "stable_acute", f"acute symptoms ({acute_kw!r})"

    return "routine", "no acute or red-flag features detected"


def _age_from_band(age_band: str) -> int | None:
    """Parse the leading integer from an age band like '70-79' or '80+'."""
    match = re.search(r"\d+", age_band or "")
    return int(match.group()) if match else None


def vulnerability_value(age_band: str, flags: list[str]) -> tuple[float, str]:
    """0.9 if any vulnerability flag or age 70+, else 0.3 (CLAUDE.md)."""
    age = _age_from_band(age_band)
    if flags:
        return 0.9, f"vulnerability flag(s): {', '.join(flags)}"
    if age is not None and age >= 70:
        return 0.9, f"age {age_band} (70+)"
    return 0.3, "no vulnerability flags"


def wait_value(days_already_waited: int) -> float:
    """min(days / 14, 1)."""
    return min(max(days_already_waited, 0) / 14.0, 1.0)


def access_value(travel_minutes: int) -> float:
    """min(travel_minutes / 60, 1)."""
    return min(max(travel_minutes, 0) / 60.0, 1.0)


def band_for_score(score: float) -> str:
    for threshold, name in BANDS:
        if score >= threshold:
            return name
    return "admin"


def clinical_value(category: str) -> float:
    """Rubric value for a category, defaulting to routine if unknown."""
    return RUBRIC.get(category, RUBRIC["routine"])
