"""Seed the IAR knowledge base (kb/documents/*.json + kb policy) and mock data
(data/*.json). Re-run any time to regenerate. Idempotent: overwrites files.

    python scripts/seed_data.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KB_DOCS = ROOT / "kb" / "documents"
DATA = ROOT / "data"

# --- Knowledge base: NHS signposting / triage docs ({id,title,content}) -------
DOCS = [
    ("pharmacy_first_overview", "Pharmacy First service overview",
     "Pharmacy First (England, launched 31 January 2024) lets community pharmacists assess and, where appropriate, supply prescription-only medicines for seven common conditions without a GP appointment: uncomplicated urinary tract infection, acute sore throat, acute sinusitis, acute otitis media (earache), infected insect bites, impetigo, and shingles. Each condition has a defined clinical pathway with age and eligibility gateway points. Patients can walk in to a participating pharmacy or be referred. It frees GP capacity for patients who need a doctor."),
    ("pharmacy_first_uti", "Pharmacy First: urinary tract infection (UTI)",
     "Under Pharmacy First a pharmacist can assess and treat uncomplicated lower UTI in women aged 16 to 64. It does NOT cover men, pregnant women, children under 16, recurrent UTI, or suspected upper UTI (fever, flank or loin pain, vomiting) which need GP or urgent assessment. Eligible patients can be supplied antibiotics directly without a GP appointment."),
    ("pharmacy_first_sore_throat", "Pharmacy First: acute sore throat",
     "A pharmacist can assess acute sore throat in patients aged 5 and over using the FeverPAIN scoring approach and supply antibiotics only where clinically indicated; most sore throats are viral and need self-care. Excludes immunosuppressed patients and those with red-flag features (difficulty breathing or swallowing, drooling, muffled voice) who need urgent assessment."),
    ("pharmacy_first_sinusitis", "Pharmacy First: acute sinusitis",
     "Acute sinusitis can be managed by a pharmacist for patients aged 12 and over. Most cases are viral and resolve with self-care; treatment (including a nasal corticosteroid or, rarely, antibiotics) follows the clinical pathway. Symptoms beyond about 10 days, or severe or worsening symptoms, follow defined gateway points."),
    ("pharmacy_first_earache", "Pharmacy First: acute otitis media (earache)",
     "Acute otitis media (middle-ear infection) can be assessed by a pharmacist for children and young people aged 1 to 17. Many cases improve without antibiotics; the pathway uses age and symptom criteria. Children under 1, or with red-flag features, are referred for urgent assessment."),
    ("pharmacy_first_impetigo", "Pharmacy First: impetigo",
     "Localised non-bullous impetigo can be treated by a pharmacist for patients aged 1 and over, typically with topical treatment. Widespread, bullous, or recurrent impetigo, or systemic illness, is referred. Impetigo is contagious; advice on hygiene and school or work exclusion is given."),
    ("pharmacy_first_shingles", "Pharmacy First: shingles",
     "Shingles (herpes zoster) can be assessed by a pharmacist for patients aged 18 and over, with antivirals supplied within the treatment window where indicated. Shingles affecting the eye (ophthalmic), immunosuppressed patients, or pregnancy are referred for urgent medical care."),
    ("pharmacy_first_insect_bites", "Pharmacy First: infected insect bites",
     "Infected insect bites and stings can be assessed by a pharmacist for patients aged 1 and over. Signs of spreading infection or systemic illness, or suspected anaphylaxis, are excluded and escalated. Most uninfected bites need only self-care."),
    ("nhs_111", "NHS 111: urgent but not life-threatening help",
     "NHS 111 (call 111 or use 111.nhs.uk) is for urgent medical problems when it is not a 999 emergency and you are not sure what to do. 111 can assess symptoms, give advice, book an urgent care or GP slot, arrange a call-back from a nurse or clinician, or direct you to the right service. It is available 24/7. Use it for out-of-hours needs and when a GP appointment is not available in time."),
    ("emergency_999_red_flags", "999 and A&E emergency red flags",
     "Call 999 or go to A&E for life-threatening emergencies: signs of a heart attack (central chest pain or pressure, pain spreading to arm or jaw, sweating); signs of a stroke (FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 999); severe difficulty breathing; anaphylaxis; heavy uncontrollable bleeding; seizures; unconsciousness or unresponsiveness; a sudden severe headache. These must never be booked as routine GP appointments and always escalate."),
    ("urgent_treatment_centre", "Urgent treatment centres and walk-in centres",
     "Urgent treatment centres (UTCs) and walk-in centres handle urgent but non-life-threatening injuries and illnesses without an appointment: sprains and strains, suspected broken bones, minor burns, minor head injuries, cuts needing stitches, infections, and minor eye problems. They reduce A&E load. Find the nearest via NHS 111 or nhs.uk. They do not replace your GP for ongoing care."),
    ("self_care_minor", "Self-care for minor illness",
     "Many minor illnesses (common cold, cough, blocked nose, mild sore throat, headache, mild fever) are self-limiting and resolve with rest, fluids, and over-the-counter remedies from a pharmacy. A community pharmacist can advise without an appointment. Seek further help if symptoms are severe, persist beyond the expected course, or you are in a higher-risk group."),
    ("gp_appointment_types", "GP appointment types",
     "GP practices offer routine appointments (booked in advance for non-urgent issues), urgent or same-day appointments triaged by clinical need, telephone consultations, and online consultations (eConsult-style triage). Practices typically reserve a portion of same-day capacity for urgent cases. Choosing the right type, or an alternative service, gets the patient seen faster."),
    ("repeat_prescriptions", "Repeat prescriptions (admin, no appointment)",
     "Routine repeat prescription requests are an administrative task and usually do NOT need a GP appointment. They can be ordered through the NHS App, the practice online system, or a nominated pharmacy. Medication reviews may be required periodically. Reserve clinical appointments for new or changing problems."),
    ("gp_urgent_same_day", "Same-day urgent GP triage",
     "When a problem is urgent but not an emergency, GP practices triage same-day requests by clinical need, often by phone or online form first. Higher-urgency cases (worsening acute symptoms, vulnerable patients) are prioritised into reserved same-day capacity. Lower-urgency cases are offered routine slots or signposted to pharmacy, 111, or self-care."),
    ("mental_health_urgent", "Urgent mental health support",
     "For urgent mental health help, NHS 111 has a mental health option (select the mental health option when calling 111), available 24/7 for people of all ages in a crisis. Local crisis lines and text services (for example, text SHOUT to 85258) also help. If someone life is at immediate risk, call 999 or go to A&E. GP appointments support non-urgent mental health needs."),
    ("dental_urgent", "Dental problems are not GP appointments",
     "GPs cannot treat dental problems. For toothache, a dental abscess, or trauma, contact a dentist; for urgent dental help when no dentist is available, call NHS 111 which can direct you to an urgent dental service. Do not book a GP appointment for dental issues."),
    ("sexual_health", "Sexual health services (self-referral)",
     "Sexual health (GUM) clinics offer confidential testing and treatment for sexually transmitted infections, contraception, and emergency contraception, usually by self-referral without needing a GP. Many offer online testing kits. This is often faster than a GP appointment for these needs."),
    ("maternity_self_referral", "Maternity care self-referral",
     "Pregnant patients can usually self-refer to local maternity services or a midwife without seeing a GP first, via the NHS App or the local trust website. Early booking (ideally before 10 weeks) is encouraged. Pregnancy with red-flag symptoms (bleeding, severe pain, reduced fetal movements) needs urgent assessment, not a routine GP slot."),
    ("eye_problems", "Eye problems: opticians and MECS",
     "Many minor and urgent eye problems (red eye, a foreign body, sudden discomfort, recent vision changes) are handled by optometrists, including via the NHS Minor Eye Conditions Service (MECS) where commissioned, often same-day and without a GP. Sudden loss of vision, severe pain, or trauma is urgent: use 111 or A&E."),
]

# --- Ledger expansion config (concrete dated slots generated at init) ---------
SEED_SLOTS = {
    "_comment": "ledger.py expands this into concrete dated slots for the next `days_ahead` working days, relative to today, at first init. The last `reserved_fraction` of each clinician-day's slots are reserved for urgent/emergency bands (locked-slot policy).",
    "clinicians": [
        {"name": "Dr Osei", "location": "Hillingdon Road Surgery"},
        {"name": "Dr Patel", "location": "Hillingdon Road Surgery"},
        {"name": "Dr Nguyen", "location": "Hillingdon Road Surgery"},
    ],
    "day_start": "09:00",
    "day_end": "12:00",
    "slot_minutes": 20,
    "days_ahead": 5,
    "include_weekends": False,
    "reserved_fraction": 0.2,
}

# --- Mock patient profiles ----------------------------------------------------
PATIENTS = [
    {"patient_ref": "P-1042", "name": "Alan Rowe", "age_band": "60-69",
     "vulnerability_flags": ["copd"], "home_postcode_district": "UB8", "days_already_waited": 4},
    {"patient_ref": "P-2087", "name": "Mrs Patel", "age_band": "30-39",
     "vulnerability_flags": [], "home_postcode_district": "UB8", "days_already_waited": 1},
    {"patient_ref": "P-3310", "name": "Joy Adeyemi", "age_band": "70-79",
     "vulnerability_flags": ["age_70_plus"], "home_postcode_district": "UB10", "days_already_waited": 9},
    {"patient_ref": "P-4521", "name": "Tom Clarke", "age_band": "20-29",
     "vulnerability_flags": [], "home_postcode_district": "UB9", "days_already_waited": 0},
]

# --- Practice directory (overflow, follow-on) ---------------------------------
PRACTICES = [
    {"practice_id": "hillingdon-road", "name": "Hillingdon Road Surgery",
     "postcode_district": "UB8", "frontdesk_agent_url": "http://localhost:9002/"},
    {"practice_id": "uxbridge-health", "name": "Uxbridge Health Centre",
     "postcode_district": "UB8", "frontdesk_agent_url": "http://localhost:9012/"},
    {"practice_id": "yiewsley-medical", "name": "Yiewsley Medical Centre",
     "postcode_district": "UB7", "frontdesk_agent_url": "http://localhost:9022/"},
]


def main() -> None:
    KB_DOCS.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    for doc_id, title, content in DOCS:
        (KB_DOCS / f"{doc_id}.json").write_text(
            json.dumps({"id": doc_id, "title": title, "content": content}, indent=2),
            encoding="utf-8",
        )
    print(f"[kb] wrote {len(DOCS)} documents to {KB_DOCS}")
    (DATA / "seed_slots.json").write_text(json.dumps(SEED_SLOTS, indent=2), encoding="utf-8")
    (DATA / "patients.json").write_text(json.dumps(PATIENTS, indent=2), encoding="utf-8")
    (DATA / "practice_directory.json").write_text(json.dumps(PRACTICES, indent=2), encoding="utf-8")
    print(f"[data] wrote seed_slots.json, patients.json, practice_directory.json to {DATA}")


if __name__ == "__main__":
    main()
