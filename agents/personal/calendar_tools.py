"""Mock calendar tools for the personal agent (no Google creds needed).

The real edge layer would use the Google Calendar API; for the standalone agent
these provide deterministic conflict detection, event writes (in-memory), and
.ics generation for the no-agent fallback path. Pure Python, ADK-free.
"""

from datetime import datetime, time

# Demo "busy" windows: a recurring weekday work standup the patient already has.
# Used so the agent can demonstrate proactive conflict detection (DNA prevention).
_BUSY_WEEKDAY_WINDOWS = [(time(9, 0), time(9, 30))]  # 09:00–09:30, Mon–Fri

_WRITTEN_EVENTS: list[dict] = []  # in-memory calendar for the session


def _parse(dt_iso: str) -> datetime | None:
    try:
        return datetime.fromisoformat(dt_iso)
    except (ValueError, TypeError):
        return None


def check_calendar_conflict(start: str, end: str = "") -> dict:
    """Check whether a proposed appointment clashes with the patient's calendar.

    Args:
        start: Proposed start, ISO 8601 (e.g. 2026-06-15T09:20:00+01:00).
        end: Optional proposed end, ISO 8601.

    Returns:
        {"conflict": bool, "event": <name or None>} — call before accepting a slot.
    """
    s = _parse(start)
    if s is None:
        return {"conflict": False, "event": None, "note": "unparseable start time"}
    if s.weekday() < 5:  # Mon–Fri
        for w_start, w_end in _BUSY_WEEKDAY_WINDOWS:
            if w_start <= s.time() < w_end:
                return {"conflict": True, "event": "Work Team Standup"}
    return {"conflict": False, "event": None}


def write_calendar_event(title: str, start: str, end: str = "",
                         reminder_minutes: int = 120) -> dict:
    """Write a confirmed appointment to the patient's calendar (in-memory mock)."""
    event = {
        "event_id": f"EVT-{len(_WRITTEN_EVENTS) + 1:04d}",
        "title": title, "start": start, "end": end,
        "reminder_minutes": reminder_minutes,
    }
    _WRITTEN_EVENTS.append(event)
    return {"status": "written", **event}


def generate_ics(title: str, start: str, end: str = "", location: str = "") -> dict:
    """Generate an .ics calendar invite string (no-agent SMS/email fallback)."""
    def fmt(dt_iso: str) -> str:
        dt = _parse(dt_iso)
        return dt.strftime("%Y%m%dT%H%M%S") if dt else ""

    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IAR//Personal Agent//EN",
        "BEGIN:VEVENT", f"SUMMARY:{title}", f"DTSTART:{fmt(start)}",
    ]
    if end:
        lines.append(f"DTEND:{fmt(end)}")
    if location:
        lines.append(f"LOCATION:{location}")
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return {"ics": "\r\n".join(lines), "filename": "appointment.ics"}
