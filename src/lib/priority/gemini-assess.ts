import type { PriorityAssessment, PriorityBand } from "@/types";
import { assessPriority, scoreToBand } from "@/lib/priority";
import { getOpenLlmModel, openLlmChatCompletion } from "@/lib/llm/open-llm";

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizeBand(band: string | undefined, score: number): PriorityBand {
  const valid: PriorityBand[] = ["routine", "moderate", "urgent", "critical"];
  if (band && valid.includes(band as PriorityBand)) {
    return band as PriorityBand;
  }
  return scoreToBand(score);
}

function parseLlmAssessment(
  text: string,
  symptoms: string,
  waitDays: number
): PriorityAssessment | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      score?: number;
      band?: string;
      rationale?: string;
      confidence?: number;
      recommendations?: string[];
    };

    if (typeof parsed.score !== "number" || Number.isNaN(parsed.score)) return null;

    const score = clampScore(parsed.score);
    const band = normalizeBand(parsed.band, score);
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((r) => typeof r === "string" && r.trim()).slice(0, 5)
      : assessPriority(symptoms, waitDays).recommendations;

    return {
      score,
      band,
      rationale:
        typeof parsed.rationale === "string" && parsed.rationale.trim()
          ? parsed.rationale.trim()
          : `LLM assessed priority ${band} (${score}/100) for: ${symptoms.slice(0, 120)}`,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : score > 70
            ? 0.9
            : 0.82,
      recommendations,
      assessedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function assessPriorityWithLlm(
  symptoms: string,
  waitDays = 0,
  context?: string
): Promise<PriorityAssessment | null> {
  const prompt = `You are an NHS GP triage research agent. Assess clinical priority for a GP appointment request.

Symptoms: ${symptoms}
Days waiting (if known): ${waitDays}
Additional context: ${context ?? "none"}

Score 0-100 where:
- 0-39 routine (e.g. annual check, mild stable symptoms)
- 40-59 moderate (persistent symptoms, manageable pain)
- 60-79 urgent (worsening, significant pain, fever >3 days)
- 80-100 critical (chest pain, breathing difficulty, severe bleeding, possible emergency)

Return JSON only (no markdown):
{"score":number,"band":"routine|moderate|urgent|critical","rationale":"2-3 sentences","confidence":0.0-1.0,"recommendations":["action1","action2","action3"]}`;

  const text = await openLlmChatCompletion({
    messages: [{ role: "user", content: prompt }],
    model: getOpenLlmModel("research"),
    temperature: 0.2,
    maxTokens: 512,
    jsonMode: true,
  });

  if (!text) return null;
  return parseLlmAssessment(text, symptoms, waitDays);
}

/** @deprecated Use assessPriorityWithLlm */
export const assessPriorityWithGemini = assessPriorityWithLlm;

export async function assessPriorityAsync(
  symptoms: string,
  waitDays = 0,
  context?: string
): Promise<PriorityAssessment> {
  const llmResult = await assessPriorityWithLlm(symptoms, waitDays, context);
  if (llmResult) return llmResult;
  return assessPriority(symptoms, waitDays, context);
}
