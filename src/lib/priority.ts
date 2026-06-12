import type { PriorityAssessment, PriorityBand } from "@/types";

const URGENT_KEYWORDS = [
  "severe",
  "worsening",
  "chest pain",
  "breathing",
  "bleeding",
  "unconscious",
  "emergency",
  "acute",
  "intense",
  "sudden",
];

const MODERATE_KEYWORDS = [
  "persistent",
  "recurring",
  "moderate",
  "increasing",
  "swelling",
  "fever",
  "pain",
];

export function assessPriority(
  symptoms: string,
  waitDays = 0,
  context?: string
): PriorityAssessment {
  const text = `${symptoms} ${context ?? ""}`.toLowerCase();
  let score = 30;

  for (const kw of URGENT_KEYWORDS) {
    if (text.includes(kw)) score += 15;
  }
  for (const kw of MODERATE_KEYWORDS) {
    if (text.includes(kw)) score += 8;
  }

  if (waitDays > 14) score += 10;
  if (waitDays > 30) score += 15;

  score = Math.min(100, Math.max(0, score));

  const band = scoreToBand(score);
  const rationale = buildRationale(text, score, band, waitDays);
  const recommendations = buildRecommendations(band, waitDays);

  return {
    score,
    band,
    rationale,
    confidence: score > 70 ? 0.92 : score > 45 ? 0.85 : 0.78,
    recommendations,
    assessedAt: new Date().toISOString(),
  };
}

function scoreToBand(score: number): PriorityBand {
  if (score >= 80) return "critical";
  if (score >= 60) return "urgent";
  if (score >= 40) return "moderate";
  return "routine";
}

function buildRationale(
  text: string,
  score: number,
  band: PriorityBand,
  waitDays: number
): string {
  const factors: string[] = [];
  if (URGENT_KEYWORDS.some((k) => text.includes(k)))
    factors.push("urgent symptom indicators detected");
  if (MODERATE_KEYWORDS.some((k) => text.includes(k)))
    factors.push("moderate clinical signals present");
  if (waitDays > 14) factors.push(`extended wait time (${waitDays} days)`);
  if (factors.length === 0) factors.push("routine presentation with standard urgency");

  return `Priority band "${band}" assigned (score: ${score}/100). ${factors.join("; ")}.`;
}

function buildRecommendations(band: PriorityBand, waitDays: number): string[] {
  const recs: string[] = [];
  if (band === "critical" || band === "urgent") {
    recs.push("Schedule within 48 hours if possible");
    recs.push("Consider slot swap with lower-priority patient");
    recs.push("Enable expedited notification pathway");
  } else if (band === "moderate") {
    recs.push("Target appointment within 7-14 days");
    recs.push("Monitor for symptom escalation");
  } else {
    recs.push("Standard scheduling window appropriate");
    recs.push(`Current average wait: ${waitDays || 12} days`);
  }
  recs.push("Personal Agent will sync calendar preferences");
  return recs;
}

export function getPriorityColor(band: PriorityBand): string {
  const colors: Record<PriorityBand, string> = {
    routine: "bg-slate-500/20 text-slate-600 dark:text-slate-300",
    moderate: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    urgent: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    critical: "bg-red-500/20 text-red-700 dark:text-red-300",
  };
  return colors[band];
}
