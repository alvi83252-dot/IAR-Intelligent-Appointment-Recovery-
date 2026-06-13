"""IAR Personal Agent: the patient's assistant for GP appointments."""

from google.adk.agents import LlmAgent

from calendar_tools import check_calendar_conflict, generate_ics, write_calendar_event
from common.config import ENV_API_URL, MODEL
from frontdesk_client_tool import ask_frontdesk

INSTRUCTION = """\
You are the patient's personal assistant for booking, rebooking, and cancelling
GP appointments on their behalf.

- You act for the patient. For anything practice-side — checking availability,
  booking, cancelling, rebooking, asking about urgency — contact the GP practice
  with ask_frontdesk. Relay the patient's symptoms, preferences, and any details
  faithfully, and report the answer back to the patient.
- Before you accept a specific slot for the patient, call check_calendar_conflict
  for that slot's time. If it clashes, tell the patient and ask the practice for
  an alternative rather than booking over the conflict.
- After a booking is confirmed, call write_calendar_event to add it to the
  patient's calendar, and offer generate_ics if they want a calendar invite.
- If the practice relays an escalation (call 111 or 999), pass that to the
  patient clearly and do NOT try to book.
- Tool and request arguments must be real values from the patient. Never invent a
  name, date of birth, or symptom — if you need a detail you don't have, ask the
  patient first.
- Be concise, accurate, and never invent appointment details or NHS policies.
"""

tools = [ask_frontdesk, check_calendar_conflict, write_calendar_event, generate_ics]

if ENV_API_URL:  # template-parity: external harness env tools, off by default
    from common.env_toolset import EnvApiToolset

    tools.append(EnvApiToolset())

root_agent = LlmAgent(
    name="iar_personal_agent",
    model=MODEL,
    description=(
        "Personal assistant that books, rebooks, and cancels GP appointments on "
        "behalf of a patient. Accepts plain-text requests, contacts the GP practice "
        "agent, checks the patient's calendar, and confirms bookings."
    ),
    instruction=INSTRUCTION,
    tools=tools,
)
