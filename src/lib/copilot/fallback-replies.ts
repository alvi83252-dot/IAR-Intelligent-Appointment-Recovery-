import { APP_FULL_NAME, APP_NAME, PAS_LEDGER_NAME } from "@/lib/config";

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function generateFallbackReply(userText: string): string {
  const text = userText.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return `I'm ${APP_NAME}, your ${APP_FULL_NAME} assistant. I can help you book or reschedule a GP appointment, explain how our care coordination works, or guide you if something feels urgent. What would you like help with today?`;
  }

  if (
    matches(lower, [
      /\b(999|111|emergency|ambulance|can't breathe|cannot breathe|heart attack|stroke|unconscious|severe bleeding)\b/,
      /\bchest pain\b/,
      /\b(can't|cannot) breathe\b/,
    ])
  ) {
    return `That sounds serious. If you're in immediate danger, please call 999 now. For urgent NHS advice, call 111. Once you're safe, tell me your symptoms and I'll help arrange a GP appointment as quickly as possible.`;
  }

  if (matches(lower, [/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/])) {
    return `Hello! I'm ${APP_NAME}. I can help you book or rebook a GP appointment, walk you through how our agents coordinate your care, or switch to voice if you'd prefer to speak rather than type. What can I help you with?`;
  }

  if (matches(lower, [/\b(book|booking|appointment|gp|doctor|rebook|reschedule|slot)\b/])) {
    return `I'd be happy to help you book a GP appointment. Tell me about your symptoms and when you're usually free — for example weekday mornings or afternoons — and I'll assess priority and find suitable slots for you.`;
  }

  if (matches(lower, [/\b(how does|what is|explain|how do).*(iar|agent|pas|ledger|swap|priority)\b/, /\biar\b/, /\bagents?\b/])) {
    return `${APP_NAME} brings together three agents: your Personal Agent looks after preferences and calendar sync, the Research Agent assesses clinical priority, and the Front Desk Agent confirms bookings through the ${PAS_LEDGER_NAME}. They work as a team so appointments can be booked, swapped, or recovered smoothly — alongside your existing NHS records.`;
  }

  if (matches(lower, [/\b(calendar|google calendar|meetup)\b/])) {
    return `Once your appointment is confirmed, I can add it to your Google Calendar and set reminders for you. You'll also receive confirmation by SMS and email. Would you like to book a slot first?`;
  }

  if (matches(lower, [/\b(sms|email|confirm|notification)\b/])) {
    return `After booking, you'll get an SMS confirmation and an email with your appointment details, including a calendar attachment. If you've linked Gmail in settings, the email goes straight to your inbox.`;
  }

  if (matches(lower, [/\b(voice|speak|microphone|accessibility)\b/])) {
    return `You can use voice mode for a spoken, hands-free experience — tap Voice mode above, or just let me know you'd prefer to talk. I'm here to help either way.`;
  }

  if (matches(lower, [/\b(thank|thanks|cheers)\b/])) {
    return `You're welcome! If you need to book or check on an appointment, describe what you need and I'll take it from here.`;
  }

  return `Thanks for sharing that. I can help with GP bookings, explain how ${APP_NAME} coordinates your care, or guide you on urgent symptoms. Could you tell me a bit more about what you're looking for?`;
}
