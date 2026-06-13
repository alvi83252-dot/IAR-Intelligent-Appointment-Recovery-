"""Unit tests for the front-desk SQLite ledger (no ADK/LLM)."""

from ledger import Ledger


def _ledger() -> Ledger:
    # In-memory DB, seeded from the repo's data/seed_slots.json.
    return Ledger(db_path=":memory:")


def test_seed_generates_slots():
    led = _ledger()
    assert len(led.find_slots(urgent=True, limit=1000)) > 0


def test_reserved_pool_hidden_from_non_urgent():
    led = _ledger()
    routine = led.find_slots(urgent=False, limit=1000)
    urgent = led.find_slots(urgent=True, limit=1000)
    assert all(not s["from_reserved_pool"] for s in routine)
    assert len(urgent) > len(routine)  # urgent sees reserved slots too
    assert any(s["from_reserved_pool"] for s in urgent)


def test_book_then_slot_unavailable():
    led = _ledger()
    slot = led.find_slots(urgent=True, limit=1)[0]
    conf = led.book_slot(slot["slot_ref"], "P-1042", "Alan Rowe")
    assert conf["status"] == "confirmed"
    assert conf["booking_ref"].startswith("BKG-")
    again = led.book_slot(slot["slot_ref"], "P-2087")
    assert again.get("error") is True


def test_cancel_frees_slot():
    led = _ledger()
    slot = led.find_slots(urgent=True, limit=1)[0]
    conf = led.book_slot(slot["slot_ref"], "P-1042")
    cancelled = led.cancel(conf["booking_ref"])
    assert cancelled["status"] == "cancelled"
    refs = {s["slot_ref"] for s in led.find_slots(urgent=True, limit=1000)}
    assert slot["slot_ref"] in refs  # available again


def test_rebook_moves_booking_atomically():
    led = _ledger()
    s1, s2 = led.find_slots(urgent=True, limit=2)
    conf = led.book_slot(s1["slot_ref"], "P-1042", "Alan Rowe")
    moved = led.rebook(conf["booking_ref"], s2["slot_ref"])
    assert moved["status"] == "rebooked"
    assert moved["slot_ref"] == s2["slot_ref"]
    assert moved["booking_ref"] == conf["booking_ref"]  # same ref kept
    available = {s["slot_ref"] for s in led.find_slots(urgent=True, limit=1000)}
    assert s1["slot_ref"] in available and s2["slot_ref"] not in available


def test_book_unknown_slot_errors():
    assert _ledger().book_slot("SLT-nope", "P-1")["error"] is True
