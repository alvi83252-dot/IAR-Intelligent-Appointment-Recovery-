"""SQLite appointment-slot ledger for the front-desk agent.

Pure Python (no ADK) so it is unit-testable; the module-level FunctionTools
(find_slots / book_slot / cancel_or_rebook) wrap a lazily-created default Ledger.
Implements the locked-slot reserve policy from CLAUDE.md: the last
`reserved_fraction` of each clinician-day is reserved for urgent/emergency bands.
Slots are generated relative to today from data/seed_slots.json at first init.
"""

import json
import os
import sqlite3
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

_TZ = timezone(timedelta(hours=1))  # Europe/London (BST) — demo simplification
_DATA_DIR = Path(os.environ.get("DATA_DIR") or (Path(__file__).resolve().parents[2] / "data"))
_DEFAULT_DB = str(Path(__file__).resolve().parent / "ledger.db")


def _initials(name: str) -> str:
    return "".join(part[0] for part in name.split() if part).upper() or "X"


class Ledger:
    def __init__(self, db_path: str = _DEFAULT_DB, seed_config_path: Path | None = None):
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()
        self.seed_if_empty(seed_config_path or (_DATA_DIR / "seed_slots.json"))

    def _init_schema(self) -> None:
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS slots (
                   slot_ref TEXT PRIMARY KEY,
                   start TEXT NOT NULL, end TEXT NOT NULL,
                   clinician TEXT NOT NULL, location TEXT NOT NULL,
                   reserved INTEGER NOT NULL DEFAULT 0,
                   status TEXT NOT NULL DEFAULT 'available',
                   booking_ref TEXT, patient_ref TEXT, patient_name TEXT)"""
        )
        self.conn.commit()

    # -- seeding ------------------------------------------------------------
    def seed_if_empty(self, config_path: Path) -> None:
        if self.conn.execute("SELECT COUNT(*) FROM slots").fetchone()[0] > 0:
            return
        if not config_path.exists():
            return
        cfg = json.loads(config_path.read_text(encoding="utf-8"))
        self._generate(cfg)

    def _generate(self, cfg: dict) -> None:
        clinicians = cfg["clinicians"]
        h0, m0 = (int(x) for x in cfg["day_start"].split(":"))
        h1, m1 = (int(x) for x in cfg["day_end"].split(":"))
        step = timedelta(minutes=int(cfg["slot_minutes"]))
        reserved_fraction = float(cfg.get("reserved_fraction", 0.2))
        include_weekends = bool(cfg.get("include_weekends", False))

        rows = []
        day_offset, generated_days = 1, 0
        while generated_days < int(cfg["days_ahead"]):
            d = date.today() + timedelta(days=day_offset)
            day_offset += 1
            if not include_weekends and d.weekday() >= 5:
                continue
            generated_days += 1
            for clin in clinicians:
                day_slots = []
                cur = datetime.combine(d, time(h0, m0), tzinfo=_TZ)
                end_of_day = datetime.combine(d, time(h1, m1), tzinfo=_TZ)
                while cur < end_of_day:
                    day_slots.append((cur, cur + step))
                    cur += step
                reserved_from = len(day_slots) - max(1, round(len(day_slots) * reserved_fraction))
                for i, (start, end) in enumerate(day_slots):
                    ref = f"SLT-{start:%Y%m%d-%H%M}-{_initials(clin['name'])}"
                    rows.append((ref, start.isoformat(), end.isoformat(),
                                 clin["name"], clin["location"], 1 if i >= reserved_from else 0))
        self.conn.executemany(
            "INSERT OR IGNORE INTO slots (slot_ref,start,end,clinician,location,reserved) "
            "VALUES (?,?,?,?,?,?)", rows)
        self.conn.commit()

    # -- queries / mutations ------------------------------------------------
    def find_slots(self, urgent: bool = False, day: str = "", limit: int = 5) -> list[dict]:
        sql = "SELECT * FROM slots WHERE status='available'"
        params: list = []
        if not urgent:  # non-urgent requests cannot see the reserved pool
            sql += " AND reserved=0"
        if day:
            sql += " AND substr(start,1,10)=?"
            params.append(day)
        sql += " ORDER BY start LIMIT ?"
        params.append(int(limit))
        return [self._slot_dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def book_slot(self, slot_ref: str, patient_ref: str, patient_name: str = "") -> dict:
        row = self.conn.execute("SELECT * FROM slots WHERE slot_ref=?", (slot_ref,)).fetchone()
        if row is None:
            return {"error": True, "content": f"Unknown slot {slot_ref}"}
        if row["status"] != "available":
            return {"error": True, "content": f"Slot {slot_ref} is already {row['status']}"}
        booking_ref = f"BKG-{datetime.now(_TZ):%Y%m%d}-{uuid.uuid4().hex[:6]}"
        self.conn.execute(
            "UPDATE slots SET status='booked', booking_ref=?, patient_ref=?, patient_name=? "
            "WHERE slot_ref=?", (booking_ref, patient_ref, patient_name, slot_ref))
        self.conn.commit()
        return self._confirmation(booking_ref, slot_ref, "confirmed")

    def cancel(self, booking_ref: str) -> dict:
        row = self.conn.execute("SELECT * FROM slots WHERE booking_ref=?", (booking_ref,)).fetchone()
        if row is None:
            return {"error": True, "content": f"Unknown booking {booking_ref}"}
        self.conn.execute(
            "UPDATE slots SET status='available', booking_ref=NULL, patient_ref=NULL, "
            "patient_name=NULL WHERE booking_ref=?", (booking_ref,))
        self.conn.commit()
        return {"booking_ref": booking_ref, "status": "cancelled", "slot_ref": row["slot_ref"]}

    def rebook(self, booking_ref: str, new_slot_ref: str) -> dict:
        existing = self.conn.execute(
            "SELECT * FROM slots WHERE booking_ref=?", (booking_ref,)).fetchone()
        if existing is None:
            return {"error": True, "content": f"Unknown booking {booking_ref}"}
        target = self.conn.execute(
            "SELECT * FROM slots WHERE slot_ref=?", (new_slot_ref,)).fetchone()
        if target is None or target["status"] != "available":
            return {"error": True, "content": f"Slot {new_slot_ref} is not available"}
        patient_ref, patient_name = existing["patient_ref"], existing["patient_name"]
        self.conn.execute(  # free the old slot
            "UPDATE slots SET status='available', booking_ref=NULL, patient_ref=NULL, "
            "patient_name=NULL WHERE booking_ref=?", (booking_ref,))
        self.conn.execute(  # claim the new one, keep the same booking_ref (atomic rebook)
            "UPDATE slots SET status='booked', booking_ref=?, patient_ref=?, patient_name=? "
            "WHERE slot_ref=?", (booking_ref, patient_ref, patient_name, new_slot_ref))
        self.conn.commit()
        return self._confirmation(booking_ref, new_slot_ref, "rebooked")

    # -- helpers ------------------------------------------------------------
    def _confirmation(self, booking_ref: str, slot_ref: str, status: str) -> dict:
        s = self.conn.execute("SELECT * FROM slots WHERE slot_ref=?", (slot_ref,)).fetchone()
        return {
            "booking_ref": booking_ref, "slot_ref": slot_ref, "status": status,
            "start": s["start"], "end": s["end"],
            "clinician": s["clinician"], "location": s["location"],
            "patient_ref": s["patient_ref"],
        }

    @staticmethod
    def _slot_dict(r: sqlite3.Row) -> dict:
        return {
            "slot_ref": r["slot_ref"], "start": r["start"], "end": r["end"],
            "clinician": r["clinician"], "location": r["location"],
            "from_reserved_pool": bool(r["reserved"]),
        }


# --- module-level ADK FunctionTools (lazy default ledger) ---------------------
_LEDGER: Ledger | None = None


def _ledger() -> Ledger:
    global _LEDGER
    if _LEDGER is None:
        _LEDGER = Ledger(os.environ.get("IAR_LEDGER_DB", _DEFAULT_DB))
    return _LEDGER


def find_slots(urgent: bool = False, day: str = "", limit: int = 5) -> dict:
    """Find available appointment slots.

    Args:
        urgent: True only for urgent/emergency bands — unlocks the reserved pool.
        day: Optional YYYY-MM-DD filter.
        limit: Max slots to return.
    """
    return {"slots": _ledger().find_slots(urgent=urgent, day=day, limit=limit)}


def book_slot(slot_ref: str, patient_ref: str, patient_name: str = "") -> dict:
    """Book an available slot for a patient. Returns a booking confirmation."""
    return _ledger().book_slot(slot_ref, patient_ref, patient_name)


def cancel_or_rebook(booking_ref: str, new_slot_ref: str = "") -> dict:
    """Cancel a booking, or atomically rebook it to new_slot_ref if provided."""
    led = _ledger()
    return led.rebook(booking_ref, new_slot_ref) if new_slot_ref else led.cancel(booking_ref)
